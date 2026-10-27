import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { configureCors } from "../src/config/cors.js";

const app = express();
configureCors(app);
app.get("/api/test", (_request, response) => {
  response.json({ success: true });
});

const server = app.listen(0, "127.0.0.1");
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

test("allows each approved frontend origin with credentials", async () => {
  for (const origin of ["https://fabpodd.com", "https://www.fabpodd.com", "http://localhost:5173"]) {
    const response = await fetch(`${baseUrl}/api/test`, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  }
});

test("rejects an unapproved origin without an allow-origin header", async () => {
  const response = await fetch(`${baseUrl}/api/test`, {
    headers: { Origin: "https://malicious.example" }
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await response.json(), { message: "Origin is not allowed by CORS." });
});

test("answers an approved OPTIONS preflight with the required CORS headers", async () => {
  const response = await fetch(`${baseUrl}/api/test`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://fabpodd.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://fabpodd.com");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(response.headers.get("access-control-allow-methods") ?? "", /POST/);
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /Content-Type/i);
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /Authorization/i);
});

test("rejects a preflight from an unapproved origin", async () => {
  const response = await fetch(`${baseUrl}/api/test`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://malicious.example",
      "Access-Control-Request-Method": "GET"
    }
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("serves normal non-browser API requests", async () => {
  const response = await fetch(`${baseUrl}/api/test`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await response.json(), { success: true });
});

