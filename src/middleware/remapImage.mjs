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

    // There could be multiple ":" in the to string, but the tag is always the last
    if (config.to.includes(":")) {
      const toSplit = config.to.split(":");
      toSplit.pop();
      this.toImage = toSplit.join(":");
    } else {
      this.toImage = config.to;
    }

    const parsedTo = parseFamiliarName(config.to);
    this.toTag = parsedTo.tag || "latest";
  }

  applies(method, url) {
    return method === "POST" && (url.pathname.endsWith("/containers/create") || url.pathname.endsWith("/images/create"));
  }

  run(requestOptions, url, body) {
    if (url.pathname.endsWith("/containers/create")) {
      this.#evaluateContainerCreate(body);
    }

    if (url.pathname.endsWith("/images/create")) {
      this.#evaluateImageCreate(url);
    }
  }

  #evaluateContainerCreate(body) {
    const requestedImage = parseFamiliarName(body.Image);
    const requestedTag = requestedImage.tag || "latest";

    if (this.#isMatch(requestedImage, requestedTag, this.parsedFrom, this.fromTag)) {
      body.Image = `${this.toImage}:${this.toTag}`;
    }
  }

  #evaluateImageCreate(url) {
    const requestedImageString =
      url.searchParams.get("fromImage") + ":" + url.searchParams.get("tag");

    const requestedImage = parseFamiliarName(requestedImageString);
    const requestedTag = requestedImage.tag || "latest";

    if (this.#isMatch(requestedImage, requestedTag, this.parsedFrom, this.fromTag)) {
      url.searchParams.set("fromImage", this.toImage);
      url.searchParams.set("tag", this.toTag);
    }
  }

  #isMatch(requestedImage, requestedImageTag, configuredImage, configuredImageTag) {
    if (requestedImage.registry !== configuredImage.registry) {
      return false;
    }

    if (requestedImage.repository !== configuredImage.repository) {
      return false;
    }

    return requestedImageTag === configuredImageTag;
  }

  toString() {
    return `RemapImage - rewriting image ${this.from} to ${this.to}`;
  }
}
