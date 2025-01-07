import { AddLabelsMiddleware } from "./middleware/addLabels.mjs";
import { NamespaceAllowListMiddleware } from "./middleware/namespaceAllowlist.mjs";
import { ReadonlyAccessMiddleware } from "./middleware/readonlyAccess.mjs";
import { RegistryBlockerMiddleware } from "./middleware/registryBlocker.mjs";
import { RewriteVolumePathMiddleware } from "./middleware/rewriteVolumePath.mjs";
import { RemapImageMiddleware } from "./middleware/remapImage.mjs";

export class MiddlewareChain {
  constructor(config) {
    const gates = [];
    const mutators = [];

    for (let rewrite of config.mutators) {
      switch (rewrite.type) {
        case "volumePath":
          mutators.push(new RewriteVolumePathMiddleware(rewrite));
          break;
        case "addLabels":
          mutators.push(new AddLabelsMiddleware(rewrite));
          break;
        case "remapImage":
          mutators.push(new RemapImageMiddleware(rewrite));
          break;
      }
    }

    for (let gate of config.gates) {
      switch (gate.type) {
        case "registry":
          gates.push(new RegistryBlockerMiddleware(gate));
          break;
        case "readonly":
          gates.push(new ReadonlyAccessMiddleware(gate));
          break;
        case "namespaceAllowlist":
          gates.push(new NamespaceAllowListMiddleware(gate));
          break;
      }
    }

    this.gates = gates;
    this.mutators = mutators;
    this.chain = [...gates, ...mutators];
  }

  hasApplyingMiddleware(method, url) {
    for (let middleware of this.chain) {
      if (middleware.applies(method, url)) {
        return true;
      }
    }
    return false;
  }

  applyMiddleware(requestOptions, url, body) {
    for (let middleware of this.mutators) {
      if (middleware.applies(requestOptions.method, url)) {
        middleware.run(requestOptions, url, body);
      }
    }

    for (let middleware of this.gates) {
      if (middleware.applies(requestOptions.method, url)) {
        middleware.run(requestOptions, url, body);
      }
    }
  }

  toString() {
    return this.chain
      .map((middleware) => `-- ${middleware.toString()}`)
      .join("\n");
  }
}
