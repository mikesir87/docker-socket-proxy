import { URL } from "url";
import { RewriteVolumePathMiddleware } from "../../src/middleware/rewriteVolumePath.mjs";

describe("RewriteVolumePathMiddleware", () => {
  let middleware;
  const FROM = "/requested/path";
  const TO = "/rewritten/path";

  beforeAll(() => {
    middleware = new RewriteVolumePathMiddleware({
      from: FROM,
      to: TO,
    });
  });

  describe("constructor", () => {
    it("requires a from setting", () => {
      expect(() => new RewriteVolumePathMiddleware({ to: "test" })).toThrow(
        "Missing 'from' in config",
      );
    });

    it("requires a to setting", () => {
      expect(() => new RewriteVolumePathMiddleware({ from: "test" })).toThrow(
        "Missing 'to' in config",
      );
    });
  });

  describe("applies", () => {
    it("applies to POST /containers/create", () => {
      expect(
        middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(true);
    });

    it("does not apply to GET /containers/create", () => {
      expect(
        middleware.applies(
          "GET",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(false);
    });

    it("does not apply to POST /images/create", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/images/create")),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("doesn't do anything if no binds are configured", () => {
      const body = {
        HostConfig: {
          Binds: [],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);
    });

    it("remaps when exact matches occur", () => {
      const body = {
        HostConfig: {
          Binds: [`${FROM}:/some/other/path`],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.HostConfig.Binds).toEqual([`${TO}:/some/other/path`]);
    });
  });

  it("remaps when additional path is specified", () => {
    const body = {
      HostConfig: {
        Binds: [`${FROM}/additional/path:/some/other/path`],
      },
    };

    middleware.run({}, new URL("http://localhost/containers/create"), body);

    expect(body.HostConfig.Binds).toEqual([
      `${TO}/additional/path:/some/other/path`,
    ]);
  });

  it("correctly handles trying to break out", () => {
    const body = {
      HostConfig: {
        Binds: [`${FROM}/../../path:/some/other/path`],
      },
    };

    middleware.run({}, new URL("http://localhost/containers/create"), body);

    expect(body.HostConfig.Binds).toEqual([
      `${FROM}/../../path:/some/other/path`,
    ]);
  });

  it("correctly handles data in front of the from", () => {
    const body = {
      HostConfig: {
        Binds: [`/test/${FROM}/../../path:/some/other/path`],
      },
    };

    middleware.run({}, new URL("http://localhost/containers/create"), body);

    expect(body.HostConfig.Binds).toEqual([
      `/test/${FROM}/../../path:/some/other/path`,
    ]);
  });
});
