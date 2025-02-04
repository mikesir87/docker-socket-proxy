export class MiddlewareChain {
  constructor(gates, mutators) {
    this.gates = gates;
    this.mutators = mutators;
  }

  hasMiddleware() {
    return this.hasGates() || this.hasMutators();
  }

  hasMutators() {
    return this.mutators.length > 0;
  }

  hasGates() {
    return this.gates.length > 0;
  }

  applyMutators(requestOptions, url, body) {
    for (let middleware of this.mutators) {
      middleware.run(requestOptions, url, body);
    }
  }

  applyGates(requestOptions, url, body) {
    for (let middleware of this.gates) {
      middleware.run(requestOptions, url, body);
    }
  }

  toString() {
    return this.chain
      .map((middleware) => `-- ${middleware.toString()}`)
      .join("\n");
  }
}
