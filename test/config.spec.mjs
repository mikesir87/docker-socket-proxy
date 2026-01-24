import fs from "fs";
import path from "path";
import os from "os";
import { Config } from "../src/config.mjs";

describe("Config", () => {
  let originalEnv;
  let tempDir;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
  });

  afterEach(() => {
    process.env = originalEnv;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe("getConfigData with CONFIG_DIR", () => {
    beforeEach(() => {
      delete process.env.CONFIG_FILE;
      delete process.env.CONFIG_DATA;
    });

    it("loads config from a single file in directory", () => {
      const configFile = path.join(tempDir, "01-gates.yaml");
      fs.writeFileSync(
        configFile,
        `
gates:
  - type: readonly
`,
      );

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(1);
      expect(config.gates[0].type).toBe("readonly");
      expect(config.mutators).toHaveLength(0);
      expect(config.responseFilters).toHaveLength(0);
    });

    it("merges multiple config files in alphabetical order", () => {
      fs.writeFileSync(
        path.join(tempDir, "01-gates.yaml"),
        `
gates:
  - type: readonly
`,
      );
      fs.writeFileSync(
        path.join(tempDir, "02-mutators.yaml"),
        `
mutators:
  - type: mountPath
    from: /source
    to: /dest
`,
      );
      fs.writeFileSync(
        path.join(tempDir, "03-filters.yaml"),
        `
responseFilters:
  - type: labelFilter
    requiredLabels:
      env: test
`,
      );

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(1);
      expect(config.gates[0].type).toBe("readonly");
      expect(config.mutators).toHaveLength(1);
      expect(config.mutators[0].type).toBe("mountPath");
      expect(config.responseFilters).toHaveLength(1);
      expect(config.responseFilters[0].type).toBe("labelFilter");
    });

    it("concatenates arrays when multiple files define the same type", () => {
      fs.writeFileSync(
        path.join(tempDir, "01-first-gates.yaml"),
        `
gates:
  - type: readonly
`,
      );
      fs.writeFileSync(
        path.join(tempDir, "02-second-gates.yaml"),
        `
gates:
  - type: registryBlocker
    blockedRegistries:
      - evil.registry.com
`,
      );

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(2);
      expect(config.gates[0].type).toBe("readonly");
      expect(config.gates[1].type).toBe("registryBlocker");
    });

    it("handles .yml extension", () => {
      fs.writeFileSync(
        path.join(tempDir, "config.yml"),
        `
gates:
  - type: readonly
`,
      );

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(1);
    });

    it("ignores non-yaml files", () => {
      fs.writeFileSync(
        path.join(tempDir, "config.yaml"),
        `
gates:
  - type: readonly
`,
      );
      fs.writeFileSync(
        path.join(tempDir, "readme.txt"),
        "This is not a config",
      );
      fs.writeFileSync(path.join(tempDir, "config.json"), '{"gates": []}');

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(1);
    });

    it("returns empty arrays when directory exists but has no yaml files", () => {
      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(0);
      expect(config.mutators).toHaveLength(0);
      expect(config.responseFilters).toHaveLength(0);
    });

    it("handles empty yaml files gracefully", () => {
      fs.writeFileSync(path.join(tempDir, "empty.yaml"), "");
      fs.writeFileSync(
        path.join(tempDir, "valid.yaml"),
        `
gates:
  - type: readonly
`,
      );

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(1);
    });

    it("handles yaml files with only comments", () => {
      fs.writeFileSync(
        path.join(tempDir, "comments.yaml"),
        `
# This is a comment
# Another comment
`,
      );
      fs.writeFileSync(
        path.join(tempDir, "valid.yaml"),
        `
mutators:
  - type: addLabels
    labels:
      added: "true"
`,
      );

      process.env.CONFIG_DIR = tempDir;
      const config = Config.getConfigData();

      expect(config.mutators).toHaveLength(1);
    });
  });

  describe("config source priority", () => {
    it("CONFIG_FILE takes precedence over CONFIG_DIR", () => {
      const configFile = path.join(tempDir, "single-config.yaml");
      fs.writeFileSync(
        configFile,
        `
gates:
  - type: readonly
`,
      );

      const configDir = path.join(tempDir, "config.d");
      fs.mkdirSync(configDir);
      fs.writeFileSync(
        path.join(configDir, "dir-config.yaml"),
        `
mutators:
  - type: mountPath
    from: /a
    to: /b
`,
      );

      process.env.CONFIG_FILE = configFile;
      process.env.CONFIG_DIR = configDir;

      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(1);
      expect(config.mutators).toHaveLength(0);
    });

    it("CONFIG_DATA takes precedence over CONFIG_DIR", () => {
      const configDir = path.join(tempDir, "config.d");
      fs.mkdirSync(configDir);
      fs.writeFileSync(
        path.join(configDir, "dir-config.yaml"),
        `
gates:
  - type: readonly
`,
      );

      process.env.CONFIG_DATA = `
mutators:
  - type: mountPath
    from: /a
    to: /b
`;
      process.env.CONFIG_DIR = configDir;

      const config = Config.getConfigData();

      expect(config.gates).toHaveLength(0);
      expect(config.mutators).toHaveLength(1);
    });
  });

  describe("getConfigDir", () => {
    it("returns default path when CONFIG_DIR is not set", () => {
      delete process.env.CONFIG_DIR;
      expect(Config.getConfigDir()).toBe("/etc/docker-socket-proxy/config.d");
    });

    it("returns custom path when CONFIG_DIR is set", () => {
      process.env.CONFIG_DIR = "/custom/config/path";
      expect(Config.getConfigDir()).toBe("/custom/config/path");
    });
  });
});
