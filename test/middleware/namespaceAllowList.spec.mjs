import { NamespaceAllowListMiddleware } from "../../src/middleware/namespaceAllowlist.mjs";

describe("NamespaceAllowListMiddleware", () => {
  let middleware;

  beforeAll(() => {
    middleware = new NamespaceAllowListMiddleware({
      namespaces: ["library", "test"]
    });
  });

  it("requires a namespaces config", () => {
    expect(() => new NamespaceAllowListMiddleware({})).toThrow("Missing 'namespaces' in config");
  });

  describe("applies", () => {
    it("applies to POST /images/create", () => {
      expect(middleware.applies("POST", new URL("http://localhost/images/create"))).toBe(true);
    });

    it("does not apply to GET /images/create", () => {
      expect(middleware.applies("GET", new URL("http://localhost/images/create"))).toBe(false);
    });

    it("does not apply to POST /containers/create", () => {
      expect(middleware.applies("POST", new URL("http://localhost/containers/create"))).toBe(false);
    });
  });

  describe("run", () => {
    it("blocks access to a forbidden namespace", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/images/create?fromImage=docker.io/foo/bar&tag=latest");
      const body = {};

      expect(() => middleware.run(requestOptions, url, body)).toThrow("Access to namespace foo is forbidden");
    });

    it("does not block access to an allowed namespace", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/images/create?fromImage=docker.io/library/bar&tag=latest");
      const body = {};

      expect(() => middleware.run(requestOptions, url, body)).not.toThrow();
    });
  });

});