import { parseFamiliarName } from "@swimlane/docker-reference";
import { ValidationError } from "./validationError.mjs";

export class NamespaceAllowListMiddleware {
  constructor(config) {
    if (!config.namespaces) {
      throw new Error("Missing 'namespaces' in config");
    }

    this.namespaces = config.namespaces;
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/images/create");
  }

  run(requestOptions, url, body) {
    const requestedImage = url.searchParams.get("fromImage") + ":" + url.searchParams.get("tag");

    const { repository } = parseFamiliarName(requestedImage);

    const namespace = repository.split("/").slice(0, -1).join('/');
    
    if (!this.namespaces.includes(namespace)) {
      throw new ValidationError(`Access to namespace ${namespace} is forbidden`);
    }
  }

  toString() {
    return `NamespaceAllowListMiddleware - ${this.namespaces.join(',')}`;
  }
}
