export class AddToNetworkMutator {
  constructor(config) {
    if (!config.networks) {
      throw new Error("Missing 'networks' in config");
    }

    this.networks = config.networks;
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/containers/create");
  }

  run(requestOptions, url, body) {
    console.log("Going to add networks", JSON.stringify(body, null, 2));

    if (body.HostConfig.NetworkMode === "host") {
      console.warn(
        "Cannot add networks to a container with 'host' network mode. Skipping.",
      );
      return;
    }

    if (body.HostConfig.NetworkMode === "none") {
      console.warn(
        "Cannot add networks to a container with 'none' network mode. Skipping.",
      );
      return;
    }

    if (!body.NetworkingConfig) {
      body.NetworkingConfig = {};
    }

    if (!body.NetworkingConfig.EndpointsConfig) {
      body.NetworkingConfig.EndpointsConfig = {};
    }

    if (body.HostConfig.NetworkMode === "default") {
      body.HostConfig.NetworkMode = this.networks[0];
      body.NetworkingConfig.EndpointsConfig = {};
    }

    const connectedNetworks = Object.keys(
      body.NetworkingConfig.EndpointsConfig || {},
    );
    for (const network of this.networks) {
      if (!connectedNetworks.includes(network)) {
        body.NetworkingConfig.EndpointsConfig[network] = {};
      }
    }
  }

  toString() {
    return `AddToNetworkMutator - adding all containers to the networks: ${JSON.stringify(this.networks)}`;
  }
}

export default {
  key: "addToNetwork",
  class: AddToNetworkMutator,
};
