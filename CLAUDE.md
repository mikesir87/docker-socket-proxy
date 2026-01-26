# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev          # Start with nodemon (auto-reload)
npm test             # Run Jest tests
npm run test-watch   # Run tests in watch mode
npm run prettier     # Format all .mjs files
npm run prettier-check  # Verify formatting
```

Pre-commit hooks run Prettier automatically via husky/lint-staged.

## Architecture Overview

Docker Socket Proxy intercepts Docker socket communication and applies a middleware pipeline similar to Kubernetes admission controllers:

```
Request → Mutators → Gates → Docker Socket → Response Filters → Response
```

**Middleware types:**
- **Mutators** (`src/middleware/mutators/`) - Modify incoming requests before forwarding
- **Gates** (`src/middleware/gates/`) - Validate requests, throw `ValidationError` to reject (returns 403)
- **Response Filters** (`src/middleware/responseFilters/`) - Transform responses before returning to client

## Adding New Middleware

Each middleware module must export a default object with:
```javascript
export default {
  key: "middlewareName",  // Used in YAML config as `type: middlewareName`
  class: MiddlewareClass,
};
```

Middleware classes must implement:
- `applies(method, url)` - Returns boolean for whether this middleware handles the request
- `run(requestOptions, url, body)` - Execute the middleware logic (gates throw ValidationError to block)

Middleware is auto-discovered via glob in `chainFactory.mjs`. Place new files in the appropriate subdirectory.

## Key Files

- `src/index.mjs` - Entry point, bootstraps proxy
- `src/server.mjs` - HTTP/Unix socket proxy implementation
- `src/config.mjs` - Configuration loading (CONFIG_FILE, CONFIG_DATA, or CONFIG_DIR env vars)
- `src/chainFactory.mjs` - Middleware discovery and chain assembly
- `src/metadataStore.mjs` - Docker API client for metadata lookups

## Configuration

YAML config specifies which middleware to enable. Example:
```yaml
gates:
  - type: readonly
mutators:
  - type: mountPath
    from: /source
    to: /dest
responseFilters:
  - type: labelFilter
    requiredLabels:
      key: value
```

Environment variables:
- `CONFIG_FILE` - Path to a single YAML configuration file
- `CONFIG_DATA` - Raw YAML configuration string
- `CONFIG_DIR` - Directory containing multiple YAML config files (default: `/etc/docker-socket-proxy/config.d`). Files are loaded in alphabetical order and merged (arrays are concatenated)
- `LISTEN_SOCKET_PATH` - Proxy socket path (default: `/tmp/docker.sock`)
- `FORWARDING_SOCKET_PATH` - Docker socket to forward to (default: `/var/run/docker.sock`)

Configuration source priority: `CONFIG_FILE` > `CONFIG_DATA` > `CONFIG_DIR`

## Testing

Tests use Jest with ES modules. Test files live in `test/` mirroring the `src/` structure.

```bash
# Run a single test file
npm test -- test/middleware/gates/readonlyAccessGate.spec.mjs

# Run tests matching a pattern
npm test -- --testPathPattern=mountPath
```

Test both `applies()` and `run()` methods separately for each middleware.

## Docker API Context

The middleware works with Docker Engine API requests. Common endpoints:
- `POST /containers/create` - Container creation (most middleware targets this)
- `POST /images/create` - Image pull
- `GET /containers/json`, `GET /volumes`, `GET /networks` - Listing endpoints (response filters target these)

Request body structures:
- `HostConfig.Binds` - String array like `["/host/path:/container/path"]`
- `HostConfig.Mounts` - Object array with `Type`, `Source`, `Target`, `VolumeOptions`

## Code Patterns

- **URL handling**: Middleware receives `URL` objects, not strings
- **Body mutation**: Mutators modify the body object in-place (no return value)
- **Config validation**: Middleware constructors should validate required config and throw descriptive errors
- **Blocking requests**: Gates throw `ValidationError` to reject (results in 403 response)

## Known Limitations

Sockets created inside a container and mounted to the host do not work as expected.

## Local Debugging

Run proxy with `npm run dev`, then point a Docker CLI at the proxy socket:
```bash
DOCKER_HOST=unix:///tmp/docker.sock docker ps
```
