import path from "path";

export class MountPathMutator {
  constructor(config) {
    if (!config.from) {
      throw new Error("Missing 'from' in config");
    }
    if (!config.to) {
      throw new Error("Missing 'to' in config");
    }

    this.to = config.to;
    this.from = config.from;
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/containers/create");
  }

  run(requestOptions, url, body) {
    if (body.HostConfig && body.HostConfig.Binds) {
      body.HostConfig.Binds = body.HostConfig.Binds.map((bind) => {
        const [requestedFrom, requestedTo] = bind.split(":");

        const { from, to, subPath } = this.#resolvePath(
          requestedFrom,
          requestedTo,
        );

        if (!subPath) {
          return `${from}:${to}`;
        }

        if (!body.HostConfig.Mounts) body.HostConfig.Mounts = [];

        body.HostConfig.Mounts.push({
          Type: "volume",
          Source: from,
          Target: to,
          VolumeOptions: {
            Subpath: subPath,
          },
        });

        return null;
      }).filter((bind) => bind !== null);
    }

    if (body.HostConfig && body.HostConfig.Mounts) {
      body.HostConfig.Mounts.forEach((mount) => {
        const { from, to, subPath, isVolume } = this.#resolvePath(
          mount.Source,
          mount.Target,
        );

        mount.Source = from;
        mount.Target = to;

        if (isVolume) {
          mount.Type = "volume";
          if (mount.BindOptions) {
            delete mount.BindOptions;
          }
        }

        if (subPath) {
          mount.VolumeOptions = {
            Subpath: subPath,
          };
        }
      });
    }
  }

  #resolvePath(requestedFrom, requestedTo) {
    const relative = path.relative(this.from, path.resolve(requestedFrom));

    // Ensure that the path is not escaping the configured from path (trying to move up directories)
    if (!relative || !relative.startsWith("..")) {
      const additionalPath = relative ? `/${relative}` : "";

      const newSource = `${this.to}${additionalPath}`;

      // If the target is an absolute path or a volume with no subpaths, we can directly rewrite
      if (newSource.startsWith("/") || newSource.indexOf("/") === -1) {
        return {
          from: newSource,
          to: requestedTo,
          isVolume: !newSource.startsWith("/"),
        };
      }

      const [volumeName, ...subPathNames] = newSource.split("/");
      return {
        from: volumeName,
        to: requestedTo,
        subPath: subPathNames.join("/"),
        isVolume: true,
      };
    }

    return {
      from: requestedFrom,
      to: requestedTo,
      isVolume: !requestedFrom.startsWith("/"),
    };
  }

  toString() {
    return `MountPathMutator - rewriting volume paths from ${this.from} to rebase to ${this.to}`;
  }
}

export default {
  key: "mountPath",
  class: MountPathMutator,
};
