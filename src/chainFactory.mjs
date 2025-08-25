import { glob } from "glob";
import { fileURLToPath, URL } from "url";
import { dirname } from "path";
import { MiddlewareChain } from "./chain.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * The MiddlewareChainFactory is used to both create the individual Middleware components
 * and to assemble them into a processing chain for incoming requests.
 *
 * It receives the raw YAML config and processes the gates, mutators, and response filters.
 * As requests come in, it creates a chain of middleware objects that apply to the request.
 */
export class MiddlewareChainFactory {
  constructor(config, metadataStore) {
    this.config = config;
    this.metadataStore = metadataStore;
  }

  async bootstrap() {
    const allGates = await this.#loadModules("gates");
    const allMutators = await this.#loadModules("mutators");
    const allResponseFilters = await this.#loadModules("responseFilters");

    this.gates = [];
    this.mutators = [];
    this.responseFilters = [];

    this.#configureType(this.config.gates, allGates, this.gates);
    this.#configureType(this.config.mutators, allMutators, this.mutators);
    this.#configureType(
      this.config.responseFilters,
      allResponseFilters,
      this.responseFilters,
    );
  }

  /**
   * Creates a middleware chain for a specific incoming request. The chain provides the
   * mutators, gates, and response filters specific to the request.
   *
   * @param {string} method The HTTP method of the incoming request
   * @param {URL} url The URL of the incoming request, complete with search parameters
   * @returns {MiddlewareChain} A chain of middleware to be used for the request
   */
  createChainForRequest(method, url) {
    const newChain = new MiddlewareChain(
      this.gates.filter((gate) => gate.applies(method, url)),
      this.mutators.filter((mutator) => mutator.applies(method, url)),
      this.responseFilters.filter((filter) => filter.applies(method, url)),
    );

    return newChain;
  }

  /**
   * Load the modules from the filesystem into an object, making it easy to instantiate a specific
   * middleware.
   * @param {string} type The type of middleware to load (e.g., "gates", "mutators", "responseFilters")
   * @returns {Promise<Object>} A promise that resolves to an object mapping middleware keys to their classes
   */
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

  /**
   * Configures a specific type of middleware based on the provided configuration.
   * @param {Array} config The configuration for the middleware
   * @param {Object} availableMiddleware All available middleware for the specific type
   * @param {Array} collection The collection to populate with configured middleware
   */
  #configureType(config, availableMiddleware, collection) {
    for (let configItem of config) {
      if (!availableMiddleware[configItem.type]) {
        console.error(`Unrecognized type in configuration: ${configItem.type}`);
        continue;
      }

      collection.push(
        new availableMiddleware[configItem.type](
          configItem,
          this.metadataStore,
        ),
      );
    }
  }

  toString() {
    return [
      "Chain factory configuration",
      "-- Gates:",
      ...this.gates.map((gate) => `---- ${gate.toString()}`),
      "-- Mutators:",
      ...this.mutators.map((mutator) => `---- ${mutator.toString()}`),
      "-- Response filters:",
      ...this.responseFilters.map((filter) => `---- ${filter.toString()}`),
    ].join("\n");
  }
}
