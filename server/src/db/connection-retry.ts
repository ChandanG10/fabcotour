const transientConnectionCodes = new Set([
  "ER_CON_COUNT_ERROR",
  "ER_TOO_MANY_USER_CONNECTIONS"
]);

export const connectionRetryDelaysMs = [100, 250, 500, 1_000] as const;

function databaseErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
}

export function isTransientConnectionLimitError(error: unknown) {
  return transientConnectionCodes.has(databaseErrorCode(error));
}

export async function withConnectionRetry<T>(
  operation: () => Promise<T>,
  delays: readonly number[] = connectionRetryDelaysMs,
  wait: (delayMs: number) => Promise<void> = (delayMs) =>
    new Promise((resolve) => setTimeout(resolve, delayMs))
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientConnectionLimitError(error) || attempt >= delays.length) {
        throw error;
      }
      await wait(delays[attempt]);
    }
  }
}
