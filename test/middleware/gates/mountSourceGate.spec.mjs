import { MountSourceGate } from "../../../src/middleware/gates/mountSourceGate.mjs";

describe("MountSourceGate", () => {
  let middleware;

  beforeAll(() => {
    middleware = new MountSourceGate({
      allowedSources: ["/home/project"],
    });
  });

  it("requires a allowedSources config", () => {
    expect(() => new MountSourceGate({})).toThrow(
      "Missing 'allowedSources' in config",
    );
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

    it("does not apply to GET /images/create", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/images/create")),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("blocks access to a forbidden bind", () => {
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Binds: ["/var/run/docker.sock:/var/run/docker.sock"],
        },
      };

      expect(() => middleware.run(null, url, body)).toThrow(
        "Mounting /var/run/docker.sock is not allowed",
      );
    });

    it("blocks access to a forbidden volume mount", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Mounts: [
            { Source: "/var/run/docker.sock", Target: "/var/run/docker.sock" },
          ],
        },
      };

      expect(() => middleware.run(requestOptions, url, body)).toThrow(
        "Mounting /var/run/docker.sock is not allowed",
      );
    });

    it("doesn't block another mount location", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Binds: ["/home/project:/somewhere/else"],
          Mounts: [{ Source: "/home/project", Target: "/var/lib/docker" }],
        },
      };

      expect(() => middleware.run(requestOptions, url, body)).not.toThrow();
    });

    it("allows a mount source that is a volume (bind)", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Binds: ["project:/home/project"],
        },
      };

      middleware = new MountSourceGate({
        allowedSources: ["project"],
      });

      expect(() => middleware.run(requestOptions, url, body)).not.toThrow();
    });

    it("allows a mount source that is a volume (mount)", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Mounts: [
            {
              Type: "volume",
              Source: "project",
              Target: "/home/project",
            },
          ],
        },
      };

      middleware = new MountSourceGate({
        allowedSources: ["project"],
      });

      expect(() => middleware.run(requestOptions, url, body)).not.toThrow();
    });
  });
});
