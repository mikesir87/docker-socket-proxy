import { parseFamiliarName } from "@swimlane/docker-reference";
import { ValidationError } from "./validationError.mjs";

export class RegistryBlockerMiddleware {
  constructor(config) {
    if (!config.registries) {
      throw new Error("Missing 'registries' in config");
    }

    this.registries = config.registries;
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/images/create");
  }

  run(requestOptions, url, body) {
    const requestedImage = url.searchParams.get("fromImage") + ":" + url.searchParams.get("tag");

    const { domain } = parseFamiliarName(requestedImage);
    if (!this.registries.includes(domain)) {
      throw new ValidationError(`Access to registry ${domain} is forbidden`);
    }
  }

  toString() {
    return `RegistryBlockerMiddleware - ${this.registries}`;
  }
}
