export class MountSourceGate {
  constructor(config, metadataStore) {
    this.metadataStore = metadataStore;

    if (!config.allowedSources) {
      throw new Error("Missing 'allowedSources' in config");
    }

    this.allowedSources = config.allowedSources.filter(
      (source) => !source.startsWith("label:"),
    );

    this.labeledSources = config.allowedSources
      .filter((source) => source.startsWith("label:"))
      .map((source) => source.split(":")[1])
      .map((labelString) => labelString.split(",").map((s) => s.split("=")))
      .map((labels) => {
        const labelObject = {};
        for (let i = 0; i < labels.length; i++) {
          const labelKey = labels[i][0];
          const labelValue = labels[i][1];
          labelObject[labelKey] = labelValue;
        }
        return labelObject;
      });
  }

  applies(method, url) {
    return method === "POST" && url.pathname.endsWith("/containers/create");
  }

  async run(requestOptions, url, body) {
    const sources = [
      ...(body.HostConfig?.Binds?.map((bind) => bind.split(":")[0]) || []),
      ...(body.HostConfig?.Mounts?.map((mount) => mount.Source) || []),
    ];

    const blockedSourcesByName = sources.filter(
      (source) => !this.allowedSources.includes(source),
    );

    if (blockedSourcesByName.length === 0) {
      return;
    }

    const allowedVolumeNames = await this.#getVolumeNamesForLabels();

    const blockedMount = blockedSourcesByName.filter(
      (m) => !allowedVolumeNames.includes(m),
    );
    if (blockedMount.length > 0) {
      throw new Error(`Mounting ${blockedMount[0]} is not allowed`);
    }
  }

  async #getVolumeNamesForLabels() {
    const allowedLabeledVolumes = [];

    for (let labels of this.labeledSources) {
      const volumes = await this.metadataStore.getVolumesForLabels(labels);
      allowedLabeledVolumes.push(...volumes.map((v) => v.Name));
    }

    return allowedLabeledVolumes;
  }

  toString() {
    return `MountSourceGate - allowing mounts from the following sources: ${this.allowedSources.join(", ")}, labeled sources: ${JSON.stringify(this.labeledSources)}`;
  }
}

export default {
  key: "mountSource",
  class: MountSourceGate,
};
