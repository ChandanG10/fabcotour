import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import serverlessApp from "../api/index.js";

const server = serverlessApp.listen(0, "127.0.0.1");
let baseUrl = "";

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("serverless adapter answers preflight before loading environment-dependent modules", async () => {
  const response = await fetch(`${baseUrl}/api/store/products`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://fabpodd.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://fabpodd.com");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});
