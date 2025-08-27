const PATHS = [
  ["/containers/json", undefined, "Labels"],
  ["/images/json", undefined, "Labels"],
  ["/networks", undefined, "Labels"],
  ["/volumes", "Volumes", "Labels"],
];

export class LabelFilter {
  constructor(config) {
    if (!config.requiredLabels && !config.forbiddenLabels) {
      throw new Error(
        "Either 'requiredLabels' or 'forbiddenLabels' needs to be configured",
      );
    }

    this.requiredLabels = config.requiredLabels || {};
    this.forbiddenLabels = config.forbiddenLabels || {};
    this.hasRequiredLabels = Object.keys(this.requiredLabels).length > 0;
    this.hasForbiddenLabels = Object.keys(this.forbiddenLabels).length > 0;

    this.objectsToFilter = config.objectsToFilter || [
      "containers",
      "images",
      "networks",
      "volumes",
    ];
    this.pathsToFilter = PATHS.filter(([path]) =>
      this.objectsToFilter.includes(path.split("/")[1]),
    );
  }

  applies(method, url) {
    if (method !== "GET") return false;

    return this.pathsToFilter.some(([path]) => url.pathname.endsWith(path));
  }

  run(url, body) {
    const forbiddenLabels = this.forbiddenLabels;
    const requiredLabels = this.requiredLabels;

    const matchingUrlPath = this.pathsToFilter.find(([path]) =>
      url.pathname.endsWith(path),
    );
    const collectionKey = matchingUrlPath[1];
    const itemKey = matchingUrlPath[2];

    const items = collectionKey ? body[collectionKey] : body;

    let newItems = items;

    if (this.hasForbiddenLabels) {
      newItems = items.filter((item) => {
        const itemLabels = item[itemKey] || {};

        for (let [key, value] of Object.entries(forbiddenLabels)) {
          if (!itemLabels[key]) return true;
          if (itemLabels[key] !== value) return true;
        }

        return false;
      });
    }

    if (this.hasRequiredLabels) {
      newItems = items.filter((item) => {
        const itemLabels = item[itemKey] || {};

        for (let [key, value] of Object.entries(requiredLabels)) {
          if (!itemLabels[key]) return false;
          if (itemLabels[key] !== value) return false;
        }

        return true;
      });
    }

    items.splice(0, items.length);
    items.push(...newItems);
  }

  toString() {
    return `LabelFilterMiddleware - Forbidden: ${JSON.stringify(this.forbiddenLabels)}; Required: ${JSON.stringify(this.requiredLabels)}; Objects: ${JSON.stringify(this.objectsToFilter)}`;
  }
}

export default {
  key: "labelFilter",
  class: LabelFilter,
};
