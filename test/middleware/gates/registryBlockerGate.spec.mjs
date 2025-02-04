import { RegistryBlockerGate } from "../../../src/middleware/gates/registryBlockerGate.mjs";

describe("RegistryBlockerGate", () => {
  let middleware;

  beforeAll(() => {
    middleware = new RegistryBlockerGate({
      registries: ["docker.io"],
    });
  });

  it("requires a registries config", () => {
    expect(() => new RegistryBlockerGate({})).toThrow(
      "Missing 'registries' in config",
    );
  });

  describe("applies", () => {
    it("applies to POST /images/create", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/images/create")),
      ).toBe(true);
    });

    it("does not apply to GET /images/create", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/images/create")),
      ).toBe(false);
    });

    it("does not apply to POST /containers/create", () => {
      expect(
        middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("blocks access to a forbidden registry", () => {
      const requestOptions = {};
      const url = new URL(
        "http://localhost/images/create?fromImage=quay.io/foo/bar&tag=latest",
      );
      const body = {};

      expect(() => middleware.run(requestOptions, url, body)).toThrow(
        "Access to registry quay.io is forbidden",
      );
    });

    it("does not block access to an allowed registry", () => {
      const requestOptions = {};
      const url = new URL(
        "http://localhost/images/create?fromImage=docker.io/foo/bar&tag=latest",
      );
      const body = {};

      expect(() => middleware.run(requestOptions, url, body)).not.toThrow();
    });

    it("does not block access to an allowed registry (docker.io default)", () => {
      const requestOptions = {};
      const url = new URL(
        "http://localhost/images/create?fromImage=foo/bar&tag=latest",
      );
      const body = {};

      expect(() => middleware.run(requestOptions, url, body)).not.toThrow();
    });
  });
});
