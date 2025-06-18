import { URL } from "url";
import { AddToNetworkMutator } from "../../../src/middleware/mutators/addToNetworkMutator.mjs";
import { Network } from "inspector/promises";

describe("AddToNetworkMutator", () => {
  describe("constructor", () => {
    it("requires a networks setting", () => {
      expect(() => new AddToNetworkMutator({})).toThrow(
        "Missing 'networks' in config",
      );
    });
  });

  describe("applies", () => {
    it("applies to POST /containers/create", () => {
      const middleware = new AddToNetworkMutator({
        networks: ["demo"],
      });

      expect(
        middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(true);
    });

    it("does not apply to GET /containers/json", () => {
      const middleware = new AddToNetworkMutator({
        networks: ["demo"],
      });

      expect(
        middleware.applies("GET", new URL("http://localhost/containers/json")),
      ).toBe(false);
    });
  });

  describe("run for container creation", () => {
    const requestOptions = { method: "POST" };
    const url = new URL("http://localhost/containers/create");
    const middleware = new AddToNetworkMutator({
      networks: ["demo"],
    });

    it("doesn't change anything if the container is already on the network (only network)", () => {
      const body = {
        HostConfig: {
          NetworkMode: "demo",
        },
        NetworkingConfig: {
          EndpointsConfig: {
            demo: {},
          },
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.HostConfig.NetworkMode).toEqual("demo");
    });

    it("adds the container to the network correctly if only on the default network", () => {
      const body = {
        HostConfig: {
          NetworkMode: "default",
        },
        NetworkingConfig: {
          EndpointsConfig: {
            default: {},
          },
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.HostConfig.NetworkMode).toEqual("demo");
      expect(body.NetworkingConfig.EndpointsConfig).toEqual({
        demo: {},
      });
    });

    it("ignores containers using host network mode", () => {
      const body = {
        HostConfig: {
          NetworkMode: "host",
        },
        NetworkingConfig: {
          EndpointsConfig: {},
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.HostConfig.NetworkMode).toEqual("host");
    });

    it("ignores containers using none network mode", () => {
      const body = {
        HostConfig: {
          NetworkMode: "none",
        },
        NetworkingConfig: {
          EndpointsConfig: {},
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.HostConfig.NetworkMode).toEqual("none");
    });

    it("works with multiple networks", () => {
      const middleware = new AddToNetworkMutator({
        networks: ["demo", "test"],
      });

      const body = {
        HostConfig: {
          NetworkMode: "default",
        },
        NetworkingConfig: {
          EndpointsConfig: {},
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.HostConfig.NetworkMode).toEqual("demo");
      expect(body.NetworkingConfig.EndpointsConfig).toEqual({
        demo: {},
        test: {},
      });
    });

    it("works when no NetworkConfig defined", () => {
      const body = {
        HostConfig: {
          NetworkMode: "default",
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.HostConfig.NetworkMode).toEqual("demo");
      expect(body.NetworkingConfig.EndpointsConfig).toEqual({
        demo: {},
      });
    });
  });
});
