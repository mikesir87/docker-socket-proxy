/**
 * Represents a chain of middleware components for processing a single request, including
 * gates, mutators, and response filters.
 */
export class MiddlewareChain {
  constructor(gates, mutators, responseFilters) {
    this.gates = gates;
    this.mutators = mutators;
    this.responseFilters = responseFilters;
  }

  /**
   * Checks if the middleware chain has any middleware components.
   * @returns {boolean} True if there are any gates, mutators, or response filters. Otherwise, false.
   */
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

  /**
   * Applies all mutators in the chain to the given request options, URL, and body.
   * @param {*} requestOptions The options for the HTTP request. This object may be modified by the mutators.
   * @param {*} url The URL of the request. This object may be modified by the mutators.
   * @param {*} body The body of the request. This object may be modified by the mutators.
   */
  async applyMutators(requestOptions, url, body) {
    for (let middleware of this.mutators) {
      await middleware.run(requestOptions, url, body);
    }
  }

  /**
   * Applies all gates in the chain to the given request options, URL, and body.
   * @param {*} requestOptions The options for the HTTP request
   * @param {*} url The URL of the request
   * @param {*} body The body of the request. This object will NOT be modified, but only validated.
   */
  async applyGates(requestOptions, url, body) {
    for (let middleware of this.gates) {
      await middleware.run(requestOptions, url, body);
    }
  }

  /**
   * Applies all response filters in the chain to the given URL and response body.
   * @param {*} url The URL of the request
   * @param {*} responseBody The body of the response. This object will be modified by the response filters.
   */
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
