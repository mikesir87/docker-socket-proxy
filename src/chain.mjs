import { AddLabelsMutator } from "./middleware/mutators/addLabelsMutator.mjs";
import { NamespaceAllowListGate } from "./middleware/gates/namespaceAllowlistGate.mjs";
import { ReadonlyAccessGate } from "./middleware/gates/readonlyAccessGate.mjs";
import { RegistryBlockerGate } from "./middleware/gates/registryBlockerGate.mjs";
import { MountPathMutator } from "./middleware/mutators/mountPathMutator.mjs";
import { RemapImageMutator } from "./middleware/mutators/remapImageMutator.mjs";

export class MiddlewareChain {
  constructor(config) {
    const gates = [];
    const mutators = [];

    for (let rewrite of config.mutators) {
      switch (rewrite.type) {
        case "mountPath":
          mutators.push(new MountPathMutator(rewrite));
          break;
        case "addLabels":
          mutators.push(new AddLabelsMutator(rewrite));
          break;
        case "remapImage":
          mutators.push(new RemapImageMutator(rewrite));
          break;
      }
    }

    for (let gate of config.gates) {
      switch (gate.type) {
        case "registry":
          gates.push(new RegistryBlockerGate(gate));
          break;
        case "readonly":
          gates.push(new ReadonlyAccessGate(gate));
          break;
        case "namespaceAllowlist":
          gates.push(new NamespaceAllowListGate(gate));
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
