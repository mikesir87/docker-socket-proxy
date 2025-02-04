import { ValidationError } from "../validationError.mjs";

export class ReadonlyAccessGate {
  constructor(config) {
    this.allowed = config.allowed ? config.allowed : [];
  }

  applies(method, url) {
    return method === "POST" || method === "PUT" || method === "DELETE";
  }

  run(requestOptions, url, body) {
    throw new ValidationError("Read-only access is enabled");
  }

  toString() {
    return `ReadonlyAccessGate - enabling read-only access`;
  }
}

export default {
  key: "readonlyAccess",
  class: ReadonlyAccessGate,
};
