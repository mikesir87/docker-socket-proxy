import fs from "fs";
import path from "path";
import YAML from "yaml";

const DEFAULT_CONFIG_DIR = "/etc/docker-socket-proxy/config.d";

export class Config {
  static getForwardingSocketPath() {
    return process.env.FORWARDING_SOCKET_PATH || "/var/run/docker.sock";
  }

  static getListeningSocketPath() {
    const socketPath = process.env.LISTEN_SOCKET_PATH || "/tmp/docker.sock";
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
    return socketPath;
  }

  static getConfigDir() {
    return process.env.CONFIG_DIR || DEFAULT_CONFIG_DIR;
  }

  static getConfigData() {
    const data = Config.#getData() || {};

    if (!data.gates) data.gates = [];
    if (!data.mutators) data.mutators = [];
    if (!data.responseFilters) data.responseFilters = [];

    return data;
  }

  static #getData() {
    if (process.env.CONFIG_FILE) {
      return YAML.parse(fs.readFileSync(process.env.CONFIG_FILE, "utf8"));
    }

    if (process.env.CONFIG_DATA) {
      return YAML.parse(process.env.CONFIG_DATA);
    }

    const configDir = Config.getConfigDir();
    if (fs.existsSync(configDir) && fs.statSync(configDir).isDirectory()) {
      return Config.#loadFromDirectory(configDir);
    }

    throw new Error(
      "No configuration provided. Either CONFIG_FILE, CONFIG_DATA, or CONFIG_DIR must be set (or default config directory must exist)",
    );
  }

  static #loadFromDirectory(dirPath) {
    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .sort();

    if (files.length === 0) {
      return {};
    }

    const configs = files.map((file) => {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, "utf8");
      return YAML.parse(content) || {};
    });

    return Config.#mergeConfigs(configs);
  }

  static #mergeConfigs(configs) {
    const merged = {
      gates: [],
      mutators: [],
      responseFilters: [],
    };

    for (const config of configs) {
      if (config.gates && Array.isArray(config.gates)) {
        merged.gates.push(...config.gates);
      }
      if (config.mutators && Array.isArray(config.mutators)) {
        merged.mutators.push(...config.mutators);
      }
      if (config.responseFilters && Array.isArray(config.responseFilters)) {
        merged.responseFilters.push(...config.responseFilters);
      }
    }

    return merged;
  }
}
