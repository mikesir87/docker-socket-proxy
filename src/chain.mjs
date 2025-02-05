export class MiddlewareChain {
  constructor(gates, mutators, responseFilters) {
    this.gates = gates;
    this.mutators = mutators;
    this.responseFilters = responseFilters;
  }

  hasMiddleware() {
    return this.hasGates() || this.hasMutators() || this.hasResponseFilters();
  }

  hasMutators() {
    return this.mutators.length > 0;
  }

  hasGates() {
    return this.gates.length > 0;
  }

  hasResponseFilters() {
    return this.responseFilters.length > 0;
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

  applyResponseFilters(url, responseBody) {
    for (let middleware of this.responseFilters) {
      middleware.run(url, responseBody);
    }
  }

  toString() {
    return this.chain
      .map((middleware) => `-- ${middleware.toString()}`)
      .join("\n");
  }
}
