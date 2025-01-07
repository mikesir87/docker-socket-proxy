import { URL } from "url";
import { RemapImageMiddleware } from "../../src/middleware/remapImage.mjs";

describe("RemapImageMiddleware", () => {
  describe("constructor", () => {
    it("requires a from setting", () => {
      expect(() => new RemapImageMiddleware({ to: "test" })).toThrow(
        "Missing 'from' in config",
      );
    });

    it("requires a to setting", () => {
      expect(() => new RemapImageMiddleware({ from: "test" })).toThrow(
        "Missing 'to' in config",
      );
    });
  });

  describe("applies", () => {
    it("applies to POST /containers/create", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      expect(
        middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(true);
    });

    it("does not apply to GET /containers/create", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      expect(
        middleware.applies(
          "GET",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("doesn't do anything if repositories are different", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      const body = {
        Image: "ubuntu",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("ubuntu");
    });

    it("remaps when exact matches occur", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      const body = {
        Image: "nginx",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx:alpine");
    });

    it("doesn't rewrite when a more specific tag is requested", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      const body = {
        Image: "nginx:2.0",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx:2.0");
    });

    it("doesn't rewrite when a more specific tag is used in config", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx:2.0",
        to: "nginx:alpine",
      });

      const body = {
        Image: "nginx",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx");
    });

    it("doesn't rewrite when registries don't match", () => {
      const middleware = new RemapImageMiddleware({
        from: "gcr.io/test/nginx:2.0",
        to: "nginx:alpine",
      });

      const body = {
        Image: "nginx",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx");
    });

    it("does rewrite when registries match", () => {
      const middleware = new RemapImageMiddleware({
        from: "gcr.io/test/nginx",
        to: "nginx:alpine",
      });

      const body = {
        Image: "gcr.io/test/nginx",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx:alpine");
    });

    it("rewrites when latest is on the from, but not requested", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx:latest",
        to: "nginx:alpine",
      });

      const body = {
        Image: "nginx",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx:alpine");
    });

    it("rewrites when latest is on the requested, but not from config", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      const body = {
        Image: "nginx:latest",
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.Image).toEqual("nginx:alpine");
    });
  });
});
