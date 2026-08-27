import { env } from "./config/env.js";
import { app } from "./app.js";

app.listen(env.SERVER_PORT, () => {
  console.log(`Fabpodd server running on port ${env.SERVER_PORT}`);
});
