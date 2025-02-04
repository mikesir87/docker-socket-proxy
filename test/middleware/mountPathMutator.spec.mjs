import { URL } from "url";
import { MountPathMutator } from "../../src/middleware/mountPathMutator.mjs";

describe("MountPathMutator", () => {
  let middleware;
  const FROM = "/requested/path";
  const TO = "/rewritten/path";

  beforeAll(() => {
    middleware = new MountPathMutator({
      from: FROM,
      to: TO,
    });
  });

  describe("constructor", () => {
    it("requires a from setting", () => {
      expect(() => new MountPathMutator({ to: "test" })).toThrow(
        "Missing 'from' in config",
      );
    });

    it("requires a to setting", () => {
      expect(() => new MountPathMutator({ from: "test" })).toThrow(
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

  describe("run with simple binds", () => {
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

    it("handles a simple volume mapping (no subpathing", () => {
      const body = {
        HostConfig: {
          Binds: ["/workspaces/project:/some/other/path"],
        },
      };

      const customMiddleware = new MountPathMutator({
        from: "/workspaces/project",
        to: "project-volume",
      });

      customMiddleware.run(
        {},
        new URL("http://localhost/containers/create"),
        body,
      );

      expect(body.HostConfig.Binds).toEqual([
        "project-volume:/some/other/path",
      ]);
    });
  });

  describe("run with Mount config", () => {
    it("doesn't do anything if no binds are configured", () => {
      const body = {
        HostConfig: {
          Mounts: [],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);
    });

    it("remaps when exact matches occur", () => {
      const body = {
        HostConfig: {
          Mounts: [
            {
              Type: "bind",
              Source: FROM,
              Target: "/some/other/path",
            },
          ],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.HostConfig.Mounts[0]).toEqual({
        Type: "bind",
        Source: TO,
        Target: "/some/other/path",
      });
    });

    it("remaps when additional path is specified", () => {
      const body = {
        HostConfig: {
          Mounts: [
            {
              Type: "bind",
              Source: `${FROM}/additional/path`,
              Target: "/some/other/path",
            },
          ],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.HostConfig.Mounts[0]).toEqual({
        Type: "bind",
        Source: `${TO}/additional/path`,
        Target: "/some/other/path",
      });
    });

    it("correctly handles trying to break out", () => {
      const body = {
        HostConfig: {
          Mounts: [
            {
              Type: "bind",
              Source: `${FROM}/../../path`,
              Target: "/some/other/path",
            },
          ],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.HostConfig.Mounts[0]).toEqual({
        Type: "bind",
        Source: `${FROM}/../../path`,
        Target: "/some/other/path",
      });
    });

    it("correctly handles data in front of the from", () => {
      const body = {
        HostConfig: {
          Mounts: [
            {
              Type: "bind",
              Source: `/test/${FROM}/../../path`,
              Target: "/some/other/path",
            },
          ],
        },
      };

      middleware.run({}, new URL("http://localhost/containers/create"), body);

      expect(body.HostConfig.Mounts[0]).toEqual({
        Type: "bind",
        Source: `/test/${FROM}/../../path`,
        Target: "/some/other/path",
      });
    });

    it("handles a simple volume mapping (no subpathing", () => {
      const body = {
        HostConfig: {
          Mounts: [
            {
              Type: "bind",
              Source: "/workspaces/project",
              Target: "/some/other/path",
            },
          ],
        },
      };

      const customMiddleware = new MountPathMutator({
        from: "/workspaces/project",
        to: "project-volume",
      });

      customMiddleware.run(
        {},
        new URL("http://localhost/containers/create"),
        body,
      );

      expect(body.HostConfig.Mounts[0]).toEqual({
        Type: "volume",
        Source: "project-volume",
        Target: "/some/other/path",
      });
    });
  });

  describe("volume subpath handling (converting Bind config to Mount)", () => {
    it("converts a bind to a mount with subpath", () => {
      const body = {
        HostConfig: {
          Binds: ["/workspaces/project/dev/db:/some/other/path"],
        },
      };

      const customMiddleware = new MountPathMutator({
        from: "/workspaces/project",
        to: "project-volume",
      });

      customMiddleware.run(
        {},
        new URL("http://localhost/containers/create"),
        body,
      );

      expect(body.HostConfig.Binds).toEqual([]);
      expect(body.HostConfig.Mounts).toEqual([
        {
          Type: "volume",
          Source: "project-volume",
          Target: "/some/other/path",
          VolumeOptions: {
            Subpath: "dev/db",
          },
        },
      ]);
    });
  });
});
