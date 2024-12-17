import http from 'http';
import fs from 'fs';

export class DockerSocketProxy {
  #server;

  constructor(listenPath, forwardPath, middlewareChain) {
    this.listenPath = listenPath;
    this.forwardPath = forwardPath;
    this.middlewareChain = middlewareChain;
  }

  /**
   * Start the proxy server
   */
  start() {
    this.#server = http.createServer(this.#onRequestWrapper.bind(this)).listen(this.listenPath);
    fs.chmodSync(this.listenPath, '777');

    this.#server.on('upgrade', (req, socket, head) => {
      console.log(`[UPGRADE REQUEST] ${req.url} - denied`);
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
    });

    console.log(`Listening and ready to accept requests on ${this.listenPath}`);
    console.log(`Forwarding requests to ${this.forwardPath}`);
  }

  /**
   * Stop the proxy server
   * @returns A Promise that is resolved when the server has stopped
   */
  stop() {
    return new Promise((acc) => {
      this.#server.stop(acc);
    });
  }
  
  /**
   * A wrapper for the request that handles errors and allows the actual handler to be async.
   * @param {http.ClientRequest} clientReq The client request
   * @param {http.ServerResponse} clientRes The response going back to the client
   */
  #onRequestWrapper(clientReq, clientRes) {
    this.#onRequest(clientReq, clientRes)
      .catch((err) => {
        console.error(err);
        clientRes.writeHead(500, { 'Content-Type': 'text/plain' });
        clientRes.end('Internal Server Error');
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
      socketPath: this.forwardPath,
      path: clientReq.url,
      method: clientReq.method,
      headers: clientReq.headers,
    };
  
    const url = new URL(`http://localhost${clientReq.url}`);
  
    // Bail early without reading the body if needed
    if (!this.middlewareChain.hasApplyingMiddleware(clientReq.method, url)) {
      this.#sendProxyRequest(clientReq, clientRes, options);
      return;
    }
  
    const body = await this.#readRequestData(clientReq);
  
    try {
      this.middlewareChain.applyMiddleware(options, url, body);
    } catch (err) {
      const statusCode = err.name === "ValidationError" ? 403 : 500;
      console.log(`[${clientReq.method}] ${clientReq.url} - ${statusCode} - ${err.message}`);
      clientRes.writeHead(statusCode, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ message: err.message }));
      return;
    }
  
    const bodyString = body ? JSON.stringify(body) : null;
    this.#sendProxyRequest(clientReq, clientRes, options, bodyString);
  }

  /**
   * Perform the actual proxy to the server.
   * @param {http.ClientRequest} clientReq The original request from the client
   * @param {http.ServerResponse} clientRes The original response going back to the client
   * @param {http.RequestOptions} proxyRequestOptions The options to send in the request
   * @param {*} bodyToSend An optional body to send with the request
   */
  #sendProxyRequest(clientReq, clientRes, proxyRequestOptions, bodyToSend) {
    if (bodyToSend && bodyToSend.length > 0)
      proxyRequestOptions.headers['content-length'] = Buffer.byteLength(bodyToSend);
  
    const proxyRequest = http.request(proxyRequestOptions, (proxyResponse) => {   
      clientRes.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      clientRes.flushHeaders();
      
      proxyResponse.pipe(clientRes);
    });
  
    if (bodyToSend)
      proxyRequest.write(bodyToSend);
  
    clientReq.pipe(proxyRequest);
  }

  /**
   * Read the body from the request and convert it to a string or JSON object
   * @param {http.ClientRequest} req The request to read data from
   * @returns {Promise<string|object|null>} The body of the request
   */
  #readRequestData(req) {
    const maxLength = req.headers['content-length'] ? 
      parseInt(req.headers['content-length']) : 0;
      
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
          if (req.headers['content-type'] === 'application/json') {
            body = JSON.parse(body);
          }
          req.removeListener('data', handleData);
          acc(body);
        }
      }
  
      req.on('data', handleData);
    });
  }
}
