import path from "path";

export class RewriteVolumePathMiddleware {
  constructor(config) {
    if (!config.from) {
      throw new Error("Missing 'from' in config");
    }
    if (!config.to) {
      throw new Error("Missing 'to' in config");
    }

    this.to = config.to;
    this.from = config.from;
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/containers/create");
  }

  run(requestOptions, url, body) {
    if (body.HostConfig && body.HostConfig.Binds) {
      body.HostConfig.Binds = body.HostConfig.Binds.map((bind) => {
        const [from, to] = bind.split(":");

        const relative = path.relative(this.from, path.resolve(from));

        if (!relative || !relative.startsWith("..")) {
          const additionalPath = relative ? `/${relative}` : "";
          return `${this.to}${additionalPath}:${to}`;
        }

        return bind;
      });
    }
  }

  toString() {
    return `RewriteVolumeMiddlware - rewriting volume paths from ${this.from} to rebase to ${this.to}`;
  }
}
