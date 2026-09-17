import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProviderError, providerErrorHttpStatus } from '../src/lib/source/provider-error.ts';
import { collectSourcePages } from '../src/sources/core/pagination.ts';
import {
  fetchWithSourceRetry,
  isRetryableSourceNetworkError,
  isTransientSourceStatus,
} from '../src/sources/core/source-fetch.ts';

test('provider error classification distinguishes safe user-facing failure states', () => {
  assert.equal(classifyProviderError('HTTP 403').kind, 'refused');
  assert.equal(classifyProviderError('rate limited; HTTP 429').kind, 'rate_limited');
  assert.equal(classifyProviderError('private relay network request failed').kind, 'relay_unavailable');
  assert.equal(classifyProviderError('HTTP 404').kind, 'missing');
  assert.equal(classifyProviderError(new TypeError('fetch failed')).kind, 'network');
  assert.equal(classifyProviderError('unexpected response').kind, 'upstream');
  assert.equal(classifyProviderError(null, { offline: true }).kind, 'offline');
});

test('provider error HTTP mapping preserves provider refusal and rate-limit semantics', () => {
  assert.equal(providerErrorHttpStatus('refused'), 403);
  assert.equal(providerErrorHttpStatus('rate_limited'), 429);
  assert.equal(providerErrorHttpStatus('missing'), 404);
  assert.equal(providerErrorHttpStatus('network'), 503);
  assert.equal(providerErrorHttpStatus('relay_unavailable'), 503);
  assert.equal(providerErrorHttpStatus('upstream'), 502);
});

test('source retry policy only treats transient gateway statuses as retryable HTTP failures', () => {
  assert.equal(isTransientSourceStatus(502), true);
  assert.equal(isTransientSourceStatus(503), true);
  assert.equal(isTransientSourceStatus(504), true);
  assert.equal(isTransientSourceStatus(429), false);
  assert.equal(isTransientSourceStatus(404), false);
});

test('source retry policy recognizes fetch/socket failures but not caller aborts', () => {
  assert.equal(isRetryableSourceNetworkError(new TypeError('fetch failed')), true);
  const socket = Object.assign(new Error('socket closed'), { code: 'UND_ERR_SOCKET' });
  assert.equal(isRetryableSourceNetworkError(socket), true);
  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  assert.equal(isRetryableSourceNetworkError(aborted), false);
});

test('source fetch retries one transient HTTP failure and then returns the response', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return calls === 1 ? new Response('temporary', { status: 503 }) : new Response('ok', { status: 200 });
  };

  const response = await fetchWithSourceRetry('https://example.test', undefined, {
    fetchImpl,
    retryDelayMs: 0,
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test('source fetch retries a transient network error once', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('fetch failed');
    return new Response('ok', { status: 200 });
  };

  const response = await fetchWithSourceRetry('https://example.test', undefined, {
    fetchImpl,
    retryDelayMs: 0,
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test('source fetch does not retry rate limits or caller aborts', async () => {
  let rateLimitCalls = 0;
  const rateLimited: typeof fetch = async () => {
    rateLimitCalls += 1;
    return new Response('slow down', { status: 429 });
  };
  const response = await fetchWithSourceRetry('https://example.test', undefined, {
    fetchImpl: rateLimited,
    retryDelayMs: 0,
  });
  assert.equal(response.status, 429);
  assert.equal(rateLimitCalls, 1);

  let abortCalls = 0;
  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  const abortingFetch: typeof fetch = async () => {
    abortCalls += 1;
    throw aborted;
  };
  await assert.rejects(
    fetchWithSourceRetry('https://example.test', undefined, {
      fetchImpl: abortingFetch,
      retryDelayMs: 0,
    }),
    /aborted/,
  );
  assert.equal(abortCalls, 1);
});

test('pagination continues when total is omitted but the provider returns a full page', async () => {
  const requestedPages: number[] = [];
  const items = await collectSourcePages<number>(
    async (page, offset, limit) => {
      requestedPages.push(page);
      assert.equal(offset, page * limit);
      if (page === 0) return { items: [1, 2] };
      if (page === 1) return { items: [3] };
      return { items: [] };
    },
    { pageSize: 2, maxPages: 5 },
  );

  assert.deepEqual(items, [1, 2, 3]);
  assert.deepEqual(requestedPages, [0, 1]);
});

test('pagination respects provider totals and a hard page cap', async () => {
  let totalCalls = 0;
  const byTotal = await collectSourcePages<number>(
    async () => {
      totalCalls += 1;
      return { items: [totalCalls], total: 1 };
    },
    { pageSize: 1, maxPages: 5 },
  );
  assert.deepEqual(byTotal, [1]);
  assert.equal(totalCalls, 1);

  let cappedCalls = 0;
  const capped = await collectSourcePages<number>(
    async () => {
      cappedCalls += 1;
      return { items: [cappedCalls] };
    },
    { pageSize: 1, maxPages: 3 },
  );
  assert.deepEqual(capped, [1, 2, 3]);
  assert.equal(cappedCalls, 3);
});
