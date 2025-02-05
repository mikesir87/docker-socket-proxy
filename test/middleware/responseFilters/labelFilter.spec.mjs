import { LabelFilter } from "../../../src/middleware/responseFilters/labelFilter.mjs";

describe("LabelFilter", () => {
  let middleware;

  beforeAll(() => {
    middleware = new LabelFilter({
      forbiddenLabels: {
        "com.example.label": "example",
        "com.example.label2": "example2",
      },
    });
  });

  it("requires a omitLabels config", () => {
    expect(() => new LabelFilter({})).toThrow(
      "Either 'requiredLabels' or 'forbiddenLabels' needs to be configured",
    );
  });

  describe("applies", () => {
    it("applies to container listing", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/containers/json")),
      ).toBe(true);
    });

    it("applies to image listing", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/images/json")),
      ).toBe(true);
    });

    it("applies to network listing", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/networks")),
      ).toBe(true);
    });

    it("applies to volume listing", () => {
      expect(
        middleware.applies("GET", new URL("http://localhost/volumes")),
      ).toBe(true);
    });

    it("doesn't apply to other URLs", () => {
      expect(
        middleware.applies(
          "POST",
          new URL("http://localhost/containers/create"),
        ),
      ).toBe(false);
    });
  });

  describe("run with omitLabels", () => {
    it("filters matching containers", () => {
      const url = new URL("http://localhost/containers/json");

      const containers = [
        { Id: "1", Labels: { "com.example.label": "example" } },
        {
          Id: "2",
          Labels: {
            "com.example.label": "example",
            "com.example.label2": "example2",
          },
        },
        { Id: "3", Labels: { "com.example.label": "wrong" } },
        { Id: "4", Labels: { "com.example.label2": "example2" } },
        { Id: "5", Labels: {} },
      ];

      middleware.run(url, containers);

      expect(containers.length).toBe(4);
      expect(containers.find((c) => c.Id === "1")).toBeDefined();
      expect(containers.find((c) => c.Id === "2")).not.toBeDefined();
      expect(containers.find((c) => c.Id === "3")).toBeDefined();
      expect(containers.find((c) => c.Id === "4")).toBeDefined();
      expect(containers.find((c) => c.Id === "5")).toBeDefined();
    });

    it("filters matching images", () => {
      const url = new URL("http://localhost/images/json");

      const images = [
        { Id: "1", Labels: { "com.example.label": "example" } },
        {
          Id: "2",
          Labels: {
            "com.example.label": "example",
            "com.example.label2": "example2",
          },
        },
        { Id: "3", Labels: { "com.example.label": "wrong" } },
        { Id: "4", Labels: { "com.example.label2": "example2" } },
        { Id: "5", Labels: {} },
      ];

      middleware.run(url, images);

      expect(images.length).toBe(4);
      expect(images.find((c) => c.Id === "1")).toBeDefined();
      expect(images.find((c) => c.Id === "2")).not.toBeDefined();
      expect(images.find((c) => c.Id === "3")).toBeDefined();
      expect(images.find((c) => c.Id === "4")).toBeDefined();
      expect(images.find((c) => c.Id === "5")).toBeDefined();
    });

    it("filters matching networks", () => {
      const url = new URL("http://localhost/networks");

      const networks = [
        { Id: "1", Labels: { "com.example.label": "example" } },
        {
          Id: "2",
          Labels: {
            "com.example.label": "example",
            "com.example.label2": "example2",
          },
        },
        { Id: "3", Labels: { "com.example.label": "wrong" } },
        { Id: "4", Labels: { "com.example.label2": "example2" } },
        { Id: "5", Labels: { } },
      ];

      middleware.run(url, networks);

      expect(networks.length).toBe(4);
      expect(networks.find((c) => c.Id === "1")).toBeDefined();
      expect(networks.find((c) => c.Id === "2")).not.toBeDefined();
      expect(networks.find((c) => c.Id === "3")).toBeDefined();
      expect(networks.find((c) => c.Id === "4")).toBeDefined();
      expect(networks.find((c) => c.Id === "5")).toBeDefined();
    });

    it("filters matching volumes", () => {
      const url = new URL("http://localhost/volumes");

      const volumes = {
        Volumes: [
          { Id: "1", Labels: { "com.example.label": "example" } },
          {
            Id: "2",
            Labels: {
              "com.example.label": "example",
              "com.example.label2": "example2",
            },
          },
          { Id: "3", Labels: { "com.example.label": "wrong" } },
          { Id: "4", Labels: { "com.example.label2": "example2" } },
          { Id: "5", Labels: {} },
        ],
      };

      middleware.run(url, volumes);

      expect(volumes.Volumes.length).toBe(4);
      expect(volumes.Volumes.find((c) => c.Id === "1")).toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "2")).not.toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "3")).toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "4")).toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "5")).toBeDefined();
    });
  });

  describe("run with requireLabels", () => {
    beforeAll(() => {
      middleware = new LabelFilter({
        requiredLabels: {
          "com.example.label": "example",
          "com.example.label2": "example2",
        },
      });
    });

    it("filters matching containers", () => {
      const url = new URL("http://localhost/containers/json");

      const containers = [
        { Id: "1", Labels: { "com.example.label": "example" } },
        {
          Id: "2",
          Labels: {
            "com.example.label": "example",
            "com.example.label2": "example2",
          },
        },
        { Id: "3", Labels: { "com.example.label": "wrong" } },
        { Id: "4", Labels: { "com.example.label2": "example2" } },
      ];

      middleware.run(url, containers);

      expect(containers.length).toBe(1);
      expect(containers.find((c) => c.Id === "1")).not.toBeDefined();
      expect(containers.find((c) => c.Id === "2")).toBeDefined();
      expect(containers.find((c) => c.Id === "3")).not.toBeDefined();
      expect(containers.find((c) => c.Id === "4")).not.toBeDefined();
    });

    it("filters matching images", () => {
      const url = new URL("http://localhost/images/json");

      const images = [
        { Id: "1", Labels: { "com.example.label": "example" } },
        {
          Id: "2",
          Labels: {
            "com.example.label": "example",
            "com.example.label2": "example2",
          },
        },
        { Id: "3", Labels: { "com.example.label": "wrong" } },
        { Id: "4", Labels: { "com.example.label2": "example2" } },
      ];

      middleware.run(url, images);

      expect(images.length).toBe(1);
      expect(images.find((c) => c.Id === "1")).not.toBeDefined();
      expect(images.find((c) => c.Id === "2")).toBeDefined();
      expect(images.find((c) => c.Id === "3")).not.toBeDefined();
      expect(images.find((c) => c.Id === "4")).not.toBeDefined();
    });

    it("filters matching networks", () => {
      const url = new URL("http://localhost/networks");

      const networks = [
        { Id: "1", Labels: { "com.example.label": "example" } },
        {
          Id: "2",
          Labels: {
            "com.example.label": "example",
            "com.example.label2": "example2",
          },
        },
        { Id: "3", Labels: { "com.example.label": "wrong" } },
        { Id: "4", Labels: { "com.example.label2": "example2" } },
      ];

      middleware.run(url, networks);

      expect(networks.length).toBe(1);
      expect(networks.find((c) => c.Id === "1")).not.toBeDefined();
      expect(networks.find((c) => c.Id === "2")).toBeDefined();
      expect(networks.find((c) => c.Id === "3")).not.toBeDefined();
      expect(networks.find((c) => c.Id === "4")).not.toBeDefined();
    });

    it("filters matching volumes", () => {
      const url = new URL("http://localhost/volumes");

      const volumes = {
        Volumes: [
          { Id: "1", Labels: { "com.example.label": "example" } },
          {
            Id: "2",
            Labels: {
              "com.example.label": "example",
              "com.example.label2": "example2",
            },
          },
          { Id: "3", Labels: { "com.example.label": "wrong" } },
          { Id: "4", Labels: { "com.example.label2": "example2" } },
        ],
      };

      middleware.run(url, volumes);

      expect(volumes.Volumes.length).toBe(1);
      expect(volumes.Volumes.find((c) => c.Id === "1")).not.toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "2")).toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "3")).not.toBeDefined();
      expect(volumes.Volumes.find((c) => c.Id === "4")).not.toBeDefined();
    });
  });
});
