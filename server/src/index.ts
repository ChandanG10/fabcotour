import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.SERVER_PORT, () => {
  console.log(`Fabpodd server running on port ${env.SERVER_PORT}`);
});
