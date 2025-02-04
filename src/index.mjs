import { MiddlewareChainFactory } from "./chainFactory.mjs";
import { Config } from "./config.mjs";
import { DockerSocketProxy } from "./server.mjs";

const LISTEN_SOCKET_PATH = Config.getListeningSocketPath();
const FORWARDING_SOCKET_PATH = Config.getForwardingSocketPath();

const middlewareChainFactory = new MiddlewareChainFactory(
  Config.getConfigData(),
);
middlewareChainFactory.bootstrap().then(() => {
  console.log("Middleware chain created and configured:");
  console.log(middlewareChainFactory.toString());

  const socketProxy = new DockerSocketProxy(
    LISTEN_SOCKET_PATH,
    FORWARDING_SOCKET_PATH,
    middlewareChainFactory,
  );
  socketProxy.start();

  ["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) => {
    process.on(signal, () => {
      console.log("Received signal", signal);
      socketProxy.stop().then(() => {
        process.exit(0);
      });
    });
  });
});
