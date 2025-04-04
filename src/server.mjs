import http from "http";
import net from "net";
import fs from "fs";
import { MiddlewareChainFactory } from "./chainFactory.mjs";
import { MiddlewareChain } from "./chain.mjs";

var createHttpHeader = function (line, headers) {
  return (
    Object.keys(headers)
      .reduce(
        function (head, key) {
          var value = headers[key];

          if (!Array.isArray(value)) {
            head.push(key + ": " + value);
            return head;
          }

          for (var i = 0; i < value.length; i++) {
            head.push(key + ": " + value[i]);
          }
          return head;
        },
        [line],
      )
      .join("\r\n") + "\r\n\r\n"
  );
};

export class DockerSocketProxy {
  #server;

  /**
   *
   * @param {string} listenPath The path this proxy should listen on
   * @param {string} forwardPath The path this proxy should forward requests to
   * @param {MiddlewareChainFactory} middlewareChainFactory
   */
  constructor(listenPath, forwardPath, middlewareChainFactory) {
    this.listenPath = listenPath;
    this.forwardPath = forwardPath;
    this.middlewareChainFactory = middlewareChainFactory;
  }

  /**
   * Start the proxy server
   */
  start() {
    this.#server = http
      .createServer(this.#onRequestWrapper.bind(this))
      .listen(this.listenPath);

    if (Number.isNaN(parseInt(this.listenPath)))
      fs.chmodSync(this.listenPath, "777");

    this.#server.on("upgrade", this.#onUpgradeRequest.bind(this));

    console.log(`Listening and ready to accept requests on ${this.listenPath}`);
    console.log(`Forwarding requests to ${this.forwardPath}`);
  }

  /**
   * Handle upgrade requests. Code inspired from the node-http-proxy library.
   *
   * @param {http.IncomingMessage} req
   * @param {net.Socket} socket
   * @param {Buffer} reqBody
   * @returns
   */
  async #onUpgradeRequest(req, socket, reqBody) {
    if (req.headers["upgrade"] !== "tcp") {
      console.log(`[UPGRADE REQUEST] ${req.url} - denied`);
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    console.log(`[UPGRADE REQUEST] ${req.url} - accepted`);
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 0);

    const rightRequestOptions = {
      socketPath: this.forwardPath,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(rightRequestOptions);

    if (reqBody) proxyReq.write(reqBody);

    proxyReq.on("error", (err) => {
      console.error("Error while proxying upgrade request", err);
      socket.end();
    });

    proxyReq.on("response", function (res) {
      // if upgrade event isn't going to happen, close the socket
      if (!res.upgrade) {
        socket.write(
          createHttpHeader(
            "HTTP/" +
              res.httpVersion +
              " " +
              res.statusCode +
              " " +
              res.statusMessage,
            res.headers,
          ),
        );
        res.pipe(socket);
      }
    });

    proxyReq.on("upgrade", function (proxyRes, proxySocket, proxyHead) {
      proxySocket.on("error", (err) => {
        console.error("Proxy socket error", err);
        socket.end();
      });

      // The pipe below will end proxySocket if socket closes cleanly, but not
      // if it errors (eg, vanishes from the net and starts returning
      // EHOSTUNREACH). We need to do that explicitly.
      socket.on("error", function () {
        proxySocket.end();
      });

      if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);

      socket.write(
        createHttpHeader("HTTP/1.1 101 Switching Protocols", proxyRes.headers),
      );

      proxySocket.pipe(socket).pipe(proxySocket);
    });

    return proxyReq.end(); // XXX: CHECK IF THIS IS THIS CORRECT
  }

  /**
   * Stop the proxy server
   * @returns A Promise that is resolved when the server has stopped
   */
  stop() {
    const close = this.#server.close.bind(this.#server);
    return new Promise(function (acc) {
      close();
    });
  }

  /**
   * A wrapper for the request that handles errors and allows the actual handler to be async.
   * @param {http.ClientRequest} clientReq The client request
   * @param {http.ServerResponse} clientRes The response going back to the client
   */
  #onRequestWrapper(clientReq, clientRes) {
    this.#onRequest(clientReq, clientRes).catch((err) => {
      console.error(err);
      clientRes.writeHead(500, { "Content-Type": "text/plain" });
      clientRes.end("Internal Server Error");
    });
  }

  /**
   * Handle the request from the client, but use middleware to modify and validate
   * the request before it is sent to the server.
   * @param {http.ClientRequest} clientReq The client request
   * @param {http.ServerResponse} clientRes The response going back to the client
   * @returns {Promise<void>} No return, but resolved when the request is complete
   */
  async #onRequest(clientReq, clientRes) {
    console.log(`[${clientReq.method}] ${clientReq.url}`);

    const options = {
      path: clientReq.url,
      method: clientReq.method,
      headers: clientReq.headers,
    };

    const url = new URL(`http://localhost${clientReq.url}`);

    const middlewareChain = this.middlewareChainFactory.createChainForRequest(
      clientReq.method,
      url,
    );

    // Bail early without reading the body if needed
    if (!middlewareChain.hasMiddleware()) {
      this.#sendProxyRequest(
        clientReq,
        clientRes,
        options,
        null,
        middlewareChain,
      );
      return;
    }

    const body = await this.#readRequestData(clientReq);

    try {
      middlewareChain.applyMutators(options, url, body);
      middlewareChain.applyGates(options, url, body);
    } catch (err) {
      console.log("ERROR", err);
      const statusCode = err.name === "ValidationError" ? 403 : 500;
      console.log(
        `[${clientReq.method}] ${clientReq.url} - ${statusCode} - ${err.message}`,
      );
      clientRes.writeHead(statusCode, { "Content-Type": "application/json" });
      clientRes.end(JSON.stringify({ message: err.message }));
      return;
    }

    options.path = url.pathname + url.search;
    options.socketPath = this.forwardPath;

    const bodyString = body ? JSON.stringify(body) : null;
    this.#sendProxyRequest(
      clientReq,
      clientRes,
      options,
      bodyString,
      middlewareChain,
    );
  }

  /**
   * Perform the actual proxy to the server.
   * @param {http.ClientRequest} clientReq The original request from the client
   * @param {http.ServerResponse} clientRes The original response going back to the client
   * @param {http.RequestOptions} proxyRequestOptions The options to send in the request
   * @param {*} bodyToSend An optional body to send with the request
   * @param {MiddlewareChain} middlewareChain The middleware chain that was used to modify the request
   */
  #sendProxyRequest(
    clientReq,
    clientRes,
    proxyRequestOptions,
    bodyToSend,
    middlewareChain,
  ) {
    if (bodyToSend && bodyToSend.length > 0)
      proxyRequestOptions.headers["content-length"] =
        Buffer.byteLength(bodyToSend);

    const proxyRequest = http.request(proxyRequestOptions, (proxyResponse) => {
      clientRes.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      clientRes.flushHeaders();

      proxyResponse.on("end", () =>
        console.log("[PROXY RESPONSE] end: " + proxyRequestOptions.path),
      );

      if (!middlewareChain.hasResponseFilters()) {
        return proxyResponse.pipe(clientRes);
      }

      const responseBodyChunks = [];
      proxyResponse.on("data", (chunk) => {
        responseBodyChunks.push(chunk);
      });

      proxyResponse.on("end", () => {
        const responseBody = JSON.parse(
          Buffer.concat(responseBodyChunks).toString(),
        );

        const url = new URL(`http://localhost${proxyRequestOptions.path}`);

        middlewareChain.applyResponseFilters(url, responseBody);
        clientRes.end(JSON.stringify(responseBody));
      });
    });

    if (proxyRequestOptions.headers["content-length"] !== undefined)
      proxyRequest.write(bodyToSend || "");

    clientReq.pipe(proxyRequest);
  }

  /**
   * Read the body from the request and convert it to a string or JSON object
   * @param {http.ClientRequest} req The request to read data from
   * @returns {Promise<string|object|null>} The body of the request
   */
  #readRequestData(req) {
    const maxLength = req.headers["content-length"]
      ? parseInt(req.headers["content-length"])
      : 0;

    if (maxLength === 0) {
      return Promise.resolve(null);
    }

    return new Promise((acc) => {
      let body = [];
      let bodyLength = 0;

      function handleData(chunk) {
        body.push(chunk);
        bodyLength += chunk.length;

        if (bodyLength === maxLength) {
          body = Buffer.concat(body).toString();
          if (req.headers["content-type"] === "application/json") {
            body = JSON.parse(body);
          }
          req.removeListener("data", handleData);
          acc(body);
        }
      }

      req.on("data", handleData);
    });
  }
}
