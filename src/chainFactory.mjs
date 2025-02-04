import { glob } from "glob";
import { fileURLToPath, URL } from "url";
import { dirname } from "path";
import { MiddlewareChain } from "./chain.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MiddlewareChainFactory {
  constructor(config) {
    this.config = config;
  }

  async bootstrap() {
    const allGates = await this.#loadModules("gates");
    const allMutators = await this.#loadModules("mutators");

    this.gates = [];
    this.mutators = [];

    for (let mutator of this.config.mutators) {
      if (!allMutators[mutator.type]) {
        console.error(`Unknown mutator type on config: ${mutator.type}`);
        continue;
      }

      this.mutators.push(new allMutators[mutator.type](mutator));
    }

    for (let gate of this.config.gates) {
      if (!allGates[gate.type]) {
        console.error(`Unknown gate type on config: ${gate.type}`);
        continue;
      }

      this.gates.push(new allGates[gate.type](gate));
    }
  }

  /**
   *
   * @param {string} method The HTTP method of the incoming request
   * @param {URL} url The URL of the incoming request, complete with search parameters
   * @returns {MiddlewareChain} A chain of middleware to be used for the request
   */
  createChainForRequest(method, url) {
    const newChain = new MiddlewareChain(
      this.gates.filter((gate) => gate.applies(method, url)),
      this.mutators.filter((mutator) => mutator.applies(method, url)),
    );

    return newChain;
  }

  async #loadModules(type) {
    const modules = {};
    const moduleFilepaths = await glob(`**/${type}/*.mjs`, {
      ignore: "**/*.spec.mjs",
      cwd: __dirname,
    });

    for (let moduleFilepath of moduleFilepaths) {
      const loadedModule = await import("./" + moduleFilepath);

      if (!loadedModule.default) {
        throw new Error(
          `Module ${moduleFilepath} does not have a default export`,
        );
      }

      if (!loadedModule.default.key) {
        throw new Error(
          `Module ${moduleFilepath} has a default export, but does not specify a key property`,
        );
      }

      if (!loadedModule.default.class) {
        throw new Error(
          `Module ${moduleFilepath} has a default export, but does not have a class property`,
        );
      }

      modules[loadedModule.default.key] = loadedModule.default.class;
    }

    return modules;
  }

  toString() {
    return [
      "Chain factory configuration",
      "-- Gates:",
      ...this.gates.map((gate) => `---- ${gate.toString()}`),
      "-- Mutators:",
      ...this.mutators.map((mutator) => `---- ${mutator.toString()}`),
    ].join("\n");
  }
}
