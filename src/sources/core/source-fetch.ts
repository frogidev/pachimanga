const TRANSIENT_HTTP_STATUSES = new Set([502, 503, 504]);
const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
]);

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
};

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === 'string') return direct;
  const cause = (error as { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') return null;
  const nested = (cause as { code?: unknown }).code;
  return typeof nested === 'string' ? nested : null;
}

export function isTransientSourceStatus(status: number) {
  return TRANSIENT_HTTP_STATUSES.has(status);
}

export function isRetryableSourceNetworkError(error: unknown) {
  if (!(error instanceof Error) || error.name === 'AbortError') return false;
  if (error instanceof TypeError) return true;
  const code = errorCode(error);
  return code ? TRANSIENT_NETWORK_CODES.has(code) : false;
}

function wait(ms: number) {
  return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/**
 * Performs an idempotent source GET with one short retry by default.
 *
 * Only transient gateway failures and network/socket errors are retried. Auth,
 * validation, rate-limit, not-found, and caller-abort responses are returned or
 * thrown immediately so providers can surface their specific failure message.
 */
export async function fetchWithSourceRetry(
  input: RequestInfo | URL,
  init?: NextFetchInit,
  options: RetryOptions = {},
): Promise<Response> {
  const retries = Math.max(0, Math.min(options.retries ?? 1, 2));
  const retryDelayMs = Math.max(0, Math.min(options.retryDelayMs ?? 200, 1_000));
  const fetchImpl = options.fetchImpl ?? fetch;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      if (attempt < retries && isTransientSourceStatus(response.status)) {
        try {
          await response.body?.cancel();
        } catch {
          // Best-effort cleanup before the bounded retry.
        }
        await wait(retryDelayMs);
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries || !isRetryableSourceNetworkError(error)) throw error;
      await wait(retryDelayMs);
    }
  }
}
