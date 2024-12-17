import fs from "fs";
import YAML from "yaml";

export class Config {
  static getForwardingSocketPath() {
    return process.env.FORWARDING_SOCKET_PATH || "/var/run/docker.sock";
  }

  static getListeningSocketPath() {
    const path = process.env.LISTEN_SOCKET_PATH || "/tmp/node-server.sock";
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
    return path;
  }

  static getConfigData() {
    const data = Config.#getData() || {};

    if (!data.gates) data.gates = [];
    if (!data.mutators) data.mutators = [];

    return data;
  }

  static #getData() {
    if (process.env.CONFIG_FILE) {
      return YAML.parse(fs.readFileSync(process.env.CONFIG_FILE, "utf8"));
    }

    if (process.env.CONFIG_DATA) {
      return YAML.parse(process.env.CONFIG_DATA);
    }

    throw new Error(
      "No configuration provided. Either CONFIG_FILE or CONFIG_DATA must be set",
    );
  }
}
