import { parseFamiliarName } from "@swimlane/docker-reference";
import { ValidationError } from "../validationError.mjs";

export class RegistryBlockerGate {
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
    const requestedImage =
      url.searchParams.get("fromImage") + ":" + url.searchParams.get("tag");

    const { domain } = parseFamiliarName(requestedImage);
    console.log("Checking domain", domain, this.registries);

    if (!this.registries.includes(domain)) {
      throw new ValidationError(`Access to registry ${domain} is forbidden`);
    }
  }

  toString() {
    return `RegistryBlockerGate - allowing only images pulled from: ${this.registries.join(", ")}`;
  }
}

export default {
  key: "registry",
  class: RegistryBlockerGate,
};
