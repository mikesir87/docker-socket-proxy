import { ImageLoadingGate } from "../../../src/middleware/gates/imageLoadingGate.mjs";

describe("ImageLoadBlockGate", () => {
  let middleware;

  beforeAll(() => {
    middleware = new ImageLoadingGate();
  });

  describe("applies", () => {
    it("applies to POST /images/load", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/images/load")),
      ).toBe(true);
    });

    it("does not apply to GET /images/create", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/images/create")),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("blocks image loading", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/images/load");
      const body = {};

      expect(() => middleware.run(requestOptions, url, body)).toThrow(
        "Image loading is blocked",
      );
    });
  });
});
