import Dockerode from "dockerode";
import { Config } from "./config.mjs";

/**
 * The MetadataStore provides access to additional resources during middleware
 * evaluation.
 *
 * Eventually, this may be "smarter" about caching and reusing metadata. But, this
 * is starting fairly simple.
 */
export class MetadataStore {
  constructor() {
    this.dockerClient = new Dockerode({
      socketPath: Config.getForwardingSocketPath(),
    });
  }

  /**
   * Retrieves Docker volumes based on the specified labels.
   * @param {*} labels The labels to filter the volumes.
   * @returns A promise that resolves to the list of matching volumes.
   */
  async getVolumesForLabels(labels) {
    const labelsArray = Object.entries(labels).map(
      ([key, value]) => `${key}=${value}`,
    );

    const volumes = await this.dockerClient.listVolumes({
      filters: { label: labelsArray },
    });
    return volumes.Volumes || [];
  }
}
