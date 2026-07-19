import { createGateway, gatewayConfigFromEnvironment } from "./index.js";

const config = gatewayConfigFromEnvironment();
const app = await createGateway({ config, logger: true });
await app.listen({ host: config.host, port: config.port });
