const PATHS = [
  ["/containers/create", "Labels"],
  ["/images/build", "labels"],
  ["/networks/create", "Labels"],
  ["/volumes/create", "Labels"],
];

export class AddLabelsMiddleware {
  constructor(config) {
    if (!config.labels) {
      throw new Error("Missing 'labels' in config");
    }

    this.labels = config.labels;
  }

  applies(method, url) {
    if (method !== "POST") return false;

    return PATHS.some(([path]) => url.pathname.endsWith(path));
  }

  run(requestOptions, url, body) {
    const labels = this.labels;

    const matchingPath = PATHS.find(([path]) => url.pathname.endsWith(path));
    const key = matchingPath[1];

    if (!body[key]) {
      body[key] = this.labels;
    }
    else {
      Object.assign(body[key], labels);
    }
  }

  toString() {
    return `AddLabelsMiddleware - ${JSON.stringify(this.labels)}`;
  }
}
