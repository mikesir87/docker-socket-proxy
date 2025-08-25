import { MountSourceGate } from "../../../src/middleware/gates/mountSourceGate.mjs";
import jest from "jest-mock";

describe("MountSourceGate", () => {
  let middleware, metadataStore;

  beforeAll(() => {
    metadataStore = {
      getVolumesForLabels: jest.fn().mockResolvedValue(Promise.resolve([])),
    };

    middleware = new MountSourceGate({
      allowedSources: ["/home/project"],
      metadataStore,
    });
  });

  it("requires a allowedSources config", () => {
    expect(() => new MountSourceGate({})).toThrow(
      "Missing 'allowedSources' in config",
    );
  });

  describe("applies", () => {
    it("applies to POST /containers/create", async () => {
      expect(
        await middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(true);
    });

    it("does not apply to GET /images/create", async () => {
      expect(
        await middleware.applies(
          "GET",
          new URL("http://localhost/images/create"),
        ),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("blocks access to a forbidden bind", async () => {
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Binds: ["/var/run/docker.sock:/var/run/docker.sock"],
        },
      };

      expect(middleware.run(null, url, body)).rejects.toThrow(
        "Mounting /var/run/docker.sock is not allowed",
      );
    });

    it("blocks access to a forbidden volume mount", async () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Mounts: [
            { Source: "/var/run/docker.sock", Target: "/var/run/docker.sock" },
          ],
        },
      };

      expect(middleware.run(requestOptions, url, body)).rejects.toThrow(
        "Mounting /var/run/docker.sock is not allowed",
      );
    });

    it("doesn't block another mount location", async () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Binds: ["/home/project:/somewhere/else"],
          Mounts: [{ Source: "/home/project", Target: "/var/lib/docker" }],
        },
      };

      expect(
        middleware.run(requestOptions, url, body),
      ).resolves.toBeUndefined();
    });

    it("allows a mount source that is a volume (bind)", async () => {
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

      expect(
        middleware.run(requestOptions, url, body),
      ).resolves.toBeUndefined();
    });

    it("allows a mount source that is a volume (mount)", async () => {
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

      expect(
        middleware.run(requestOptions, url, body),
      ).resolves.toBeUndefined();
    });

    it("allows a mount source that has a matching label (bind)", async () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        HostConfig: {
          Binds: ["project:/home/project"],
        },
      };

      middleware = new MountSourceGate(
        {
          allowedSources: ["label:demo=true"],
        },
        metadataStore,
      );

      metadataStore.getVolumesForLabels.mockResolvedValueOnce(
        Promise.resolve([{ Name: "project", Labels: { demo: "true" } }]),
      );

      expect(
        middleware.run(requestOptions, url, body),
      ).resolves.toBeUndefined();
    });

    it("allows a mount source that has a matching label (mount)", async () => {
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

      middleware = new MountSourceGate(
        {
          allowedSources: ["label:demo=true"],
        },
        metadataStore,
      );

      metadataStore.getVolumesForLabels.mockResolvedValueOnce(
        Promise.resolve([{ Name: "project", Labels: { demo: "true" } }]),
      );

      expect(
        middleware.run(requestOptions, url, body),
      ).resolves.toBeUndefined();
    });
  });
});
