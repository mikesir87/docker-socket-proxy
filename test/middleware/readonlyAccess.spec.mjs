import { ReadonlyAccessMiddleware } from "../../src/middleware/readonlyAccess.mjs";

describe("ReadonlyAccess", () => {
  let middleware;

  beforeAll(() => {
    middleware = new ReadonlyAccessMiddleware({});
  });

  describe("applies", () => {
    it("applies to POST requests", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/images/create")),
      ).toBe(true);
    });

    it("does apply to PUT requests", () => {
      expect(
        middleware.applies("PUT", new URL("http://localhost/images/create")),
      ).toBe(true);
    });

    it("does apply to DELETE requests", () => {
      expect(
        middleware.applies(
          "DELETE",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(true);
    });

    it("does not apply to GET requests", () => {
      expect(
        middleware.applies(
          "GET",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("blocks access on a PUT request", () => {
      expect(() => middleware.run({}, {}, {})).toThrow(
        "Read-only access is enabled",
      );
    });
  });
});
