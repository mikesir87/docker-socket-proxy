import { MiddlewareChain } from "./chain.mjs";
import { Config } from "./config.mjs";
import { DockerSocketProxy } from "./server.mjs";

const LISTEN_SOCKET_PATH = Config.getListeningSocketPath();
const FORWARDING_SOCKET_PATH = Config.getForwardingSocketPath();

const middlewareChain = new MiddlewareChain(Config.getConfigData());
console.log("Middleware chain created and configured:");
console.log(middlewareChain.toString());

const socketProxy = new DockerSocketProxy(
  LISTEN_SOCKET_PATH,
  FORWARDING_SOCKET_PATH,
  middlewareChain,
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
