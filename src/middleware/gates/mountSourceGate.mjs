export class MountSourceGate {
  constructor(config) {
    if (!config.allowedSources) {
      throw new Error("Missing 'allowedSources' in config");
    }

    this.allowedSources = config.allowedSources;
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/containers/create");
  }

  run(requestOptions, url, body) {
    const blockedBind = body.HostConfig?.Binds?.find((bind) => {
      const [requestedFrom] = bind.split(":");

      return !this.allowedSources.includes(requestedFrom);
    });

    if (blockedBind) {
      throw new Error(`Mounting ${blockedBind.split(":")[0]} is not allowed`);
    }

    const blockedMount = body.HostConfig?.Mounts?.find((mount) => {
      return !this.allowedSources.includes(mount.Source);
    });

    if (blockedMount) {
      throw new Error(`Mounting ${blockedMount.Source} is not allowed`);
    }
  }

  toString() {
    return `MountSourceGate - allowing mounts from the following sources: ${this.namespaces.join(", ")}`;
  }
}

export default {
  key: "mountSource",
  class: MountSourceGate,
};
