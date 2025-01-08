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

  describe("run for container creation", () => {
    const url = new URL("http://localhost/containers/create");

    it("doesn't do anything if repositories are different", () => {
      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      const body = {
        Image: "ubuntu",
      };

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

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

      middleware.run({}, url, body);

      expect(body.Image).toEqual("nginx:alpine");
    });
  });

  describe("run for image creation", () => {
    let url;

    beforeEach(() => {
      url = new URL("http://localhost/images/create");
    });

    it("doesn't do anything if repositories are different", () => {
      url.searchParams.set("fromImage", "ubuntu");
      url.searchParams.set("tag", "latest");

      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      middleware.run({}, url, {});

      expect(url.searchParams.get("fromImage")).toEqual("ubuntu");
      expect(url.searchParams.get("tag")).toEqual("latest");
    });

    it("remaps when exact matches occur", () => {
      url.searchParams.set("fromImage", "nginx");
      url.searchParams.set("tag", "latest");

      const middleware = new RemapImageMiddleware({
        from: "nginx:latest",
        to: "nginx:alpine",
      });

      middleware.run({}, url, {});

      expect(url.searchParams.get("fromImage")).toEqual("nginx");
      expect(url.searchParams.get("tag")).toEqual("alpine");
    });

    it("doesn't rewrite tags don't match", () => {
      url.searchParams.set("fromImage", "nginx");
      url.searchParams.set("tag", "2.0");

      const middleware = new RemapImageMiddleware({
        from: "nginx",
        to: "nginx:alpine",
      });

      middleware.run({}, url, {});

      expect(url.searchParams.get("fromImage")).toEqual("nginx");
      expect(url.searchParams.get("tag")).toEqual("2.0");
    });

    it("doesn't rewrite when config-specified tag doesn't match", () => {
      url.searchParams.set("fromImage", "nginx");
      url.searchParams.set("tag", "latest");

      const middleware = new RemapImageMiddleware({
        from: "nginx:2.0",
        to: "nginx:alpine",
      });

      middleware.run({}, url, {});

      expect(url.searchParams.get("fromImage")).toEqual("nginx");
      expect(url.searchParams.get("tag")).toEqual("latest");
    });

    it("doesn't rewrite when registries don't match", () => {
      url.searchParams.set("fromImage", "nginx");
      url.searchParams.set("tag", "latest");

      const middleware = new RemapImageMiddleware({
        from: "gcr.io/test/nginx:2.0",
        to: "nginx:alpine",
      });

      middleware.run({}, url, {});

      expect(url.searchParams.get("fromImage")).toEqual("nginx");
      expect(url.searchParams.get("tag")).toEqual("latest");
    });

    it("does rewrite when registries match", () => {
      url.searchParams.set("fromImage", "gcr.io/test/nginx");
      url.searchParams.set("tag", "latest");

      const middleware = new RemapImageMiddleware({
        from: "gcr.io/test/nginx",
        to: "nginx:alpine",
      });

      middleware.run({}, url, {});

      expect(url.searchParams.get("fromImage")).toEqual("nginx");
      expect(url.searchParams.get("tag")).toEqual("alpine");
    });
  });
});
