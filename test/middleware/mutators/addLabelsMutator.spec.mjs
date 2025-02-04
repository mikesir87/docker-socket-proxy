import { AddLabelsMutator } from "../../../src/middleware/mutators/addLabelsMutator.mjs";

describe("AddLabelsMutator", () => {
  let middleware;

  beforeAll(() => {
    middleware = new AddLabelsMutator({
      labels: {
        "com.example.label": "example",
        "com.example.label2": "example2",
      },
    });
  });

  it("requires a labels config", () => {
    expect(() => new AddLabelsMutator({})).toThrow(
      "Missing 'labels' in config",
    );
  });

  describe("applies", () => {
    it("applies to container creation", () => {
      expect(
        middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(true);
    });

    it("applies to image building", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/images/build")),
      ).toBe(true);
    });

    it("applies to network creation", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/networks/create")),
      ).toBe(true);
    });

    it("applies to volume creation", () => {
      expect(
        middleware.applies("POST", new URL("http://localhost/volumes/create")),
      ).toBe(true);
    });

    it("doesn't apply to other URLs", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/containers/json")),
      ).toBe(false);
    });
  });

  describe("run", () => {
    it("updates container create requests", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        Image: "ubuntu",
      };

      middleware.run(requestOptions, url, body);

      expect(body.Labels).toBeDefined();
      expect(body.Labels["com.example.label"]).toBe("example");
      expect(body.Labels["com.example.label2"]).toBe("example2");
    });

    it("updates image build requests", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/images/build");
      const body = {
        dockerfile: "./",
      };

      middleware.run(requestOptions, url, body);

      expect(body.labels).toBeDefined();
      expect(body.labels["com.example.label"]).toBe("example");
      expect(body.labels["com.example.label2"]).toBe("example2");
    });

    it("updates network creation requests", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/networks/create");
      const body = {
        dockerfile: "./",
      };

      middleware.run(requestOptions, url, body);

      expect(body.Labels).toBeDefined();
      expect(body.Labels["com.example.label"]).toBe("example");
      expect(body.Labels["com.example.label2"]).toBe("example2");
    });

    it("updates volume creation requests", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/volumes/create");
      const body = {
        dockerfile: "./",
      };

      middleware.run(requestOptions, url, body);

      expect(body.Labels).toBeDefined();
      expect(body.Labels["com.example.label"]).toBe("example");
      expect(body.Labels["com.example.label2"]).toBe("example2");
    });

    it("doesn't replace labels if there are already labels defined", () => {
      const requestOptions = {};
      const url = new URL("http://localhost/containers/create");
      const body = {
        Image: "ubuntu",
        Labels: {
          "another.label": "value",
          "com.example.label": "oldvalue",
        },
      };

      middleware.run(requestOptions, url, body);

      expect(body.Labels).toBeDefined();
      expect(body.Labels["com.example.label"]).toBe("example");
      expect(body.Labels["com.example.label2"]).toBe("example2");
      expect(body.Labels["another.label"]).toBe("value");
    });
  });
});
