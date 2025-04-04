import { ValidationError } from "../validationError.mjs";

export class ImageLoadingGate {
  constructor(config) {}

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/images/load");
  }

  run(requestOptions, url, body) {
    throw new ValidationError(`Image loading is blocked`);
  }

  toString() {
    return `ImageLoadBlockGate - blocking all image loads`;
  }
}

export default {
  key: "imageLoading",
  class: ImageLoadingGate,
};
