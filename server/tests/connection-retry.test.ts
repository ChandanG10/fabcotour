import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isTransientConnectionLimitError,
  withConnectionRetry
} from "../src/db/connection-retry.js";

function databaseError(code: string) {
  return Object.assign(new Error(code), { code });
}

test("recognizes only MySQL connection-limit errors as retryable", () => {
  assert.equal(isTransientConnectionLimitError(databaseError("ER_TOO_MANY_USER_CONNECTIONS")), true);
  assert.equal(isTransientConnectionLimitError(databaseError("ER_CON_COUNT_ERROR")), true);
  assert.equal(isTransientConnectionLimitError(databaseError("ER_NO_SUCH_TABLE")), false);
  assert.equal(isTransientConnectionLimitError(new Error("unknown")), false);
});

test("retries a transient connection-limit failure and preserves the result", async () => {
  let attempts = 0;
  const waited: number[] = [];

  const result = await withConnectionRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw databaseError("ER_TOO_MANY_USER_CONNECTIONS");
      return "connected";
    },
    [10, 20, 30],
    async (delay) => { waited.push(delay); }
  );

  assert.equal(result, "connected");
  assert.equal(attempts, 3);
  assert.deepEqual(waited, [10, 20]);
});

test("does not retry query or schema errors", async () => {
  let attempts = 0;
  await assert.rejects(
    withConnectionRetry(
      async () => {
        attempts += 1;
        throw databaseError("ER_NO_SUCH_TABLE");
      },
      [10, 20],
      async () => undefined
    ),
    { code: "ER_NO_SUCH_TABLE" }
  );
  assert.equal(attempts, 1);
});

test("stops after the bounded retry schedule", async () => {
  let attempts = 0;
  await assert.rejects(
    withConnectionRetry(
      async () => {
        attempts += 1;
        throw databaseError("ER_TOO_MANY_USER_CONNECTIONS");
      },
      [10, 20],
      async () => undefined
    ),
    { code: "ER_TOO_MANY_USER_CONNECTIONS" }
  );
  assert.equal(attempts, 3);
});
