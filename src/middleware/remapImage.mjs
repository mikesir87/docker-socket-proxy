import { parseFamiliarName } from "@swimlane/docker-reference";

export class RemapImageMiddleware {
  constructor(config) {
    if (!config.from) {
      throw new Error("Missing 'from' in config");
    }
    if (!config.to) {
      throw new Error("Missing 'to' in config");
    }

    this.to = config.to;
    this.from = config.from;

    this.parsedFrom = parseFamiliarName(config.from);
    this.fromTag = this.parsedFrom.tag || "latest";
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/containers/create");
  }

  run(requestOptions, url, body) {
    console.log("Incoming request", body.Image);
    const requestedImage = parseFamiliarName(body.Image);
    const requestedTag = requestedImage.tag || "latest";
    console.log(requestedImage);

    if (requestedImage.registry !== this.parsedFrom.registry) {
      return;
    }

    if (requestedImage.repository !== this.parsedFrom.repository) {
      return;
    }

    if (requestedTag === this.fromTag) {
      body.Image = this.to;
    }
  }

  toString() {
    return `RemapImage - rewriting image ${this.from} to ${this.to}`;
  }
}
