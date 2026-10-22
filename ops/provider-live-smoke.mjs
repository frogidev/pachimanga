import { appendFileSync } from 'node:fs';

const USER_AGENT = 'Pachimanga-provider-smoke/1.0 (+https://pachimanga.frogilab.dev)';
const RELAY_BASE_URL = (process.env.RELAY_BASE_URL || 'https://wc-relay.frogilab.dev').replace(/\/+$/, '');
const RELAY_TOKEN = process.env.RELAY_TOKEN?.trim() || '';
const TIMEOUT_MS = 12_000;

const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(4)} ${name}: ${detail}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        'User-Agent': USER_AGENT,
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, label, init = {}) {
  const response = await request(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
  return response.json();
}

async function smokeRelayPublicHealth() {
  const response = await request(`${RELAY_BASE_URL}/health`, { headers: { Accept: 'application/json,text/plain;q=0.9' } });
  const body = await response.text();
  assert(response.ok, `relay public health HTTP ${response.status}`);
  assert(body.trim().length > 0, 'relay public health returned an empty body');
  return `HTTP ${response.status}`;
}

async function smokeRelayAuthenticatedHealth() {
  if (!RELAY_TOKEN) return null;
  const payload = await getJson(`${RELAY_BASE_URL}/health/upstream`, 'relay authenticated upstream health', {
    headers: { Authorization: `Bearer ${RELAY_TOKEN}` },
  });
  assert(payload?.ok === true, `relay upstream health not OK${payload?.error ? `: ${payload.error}` : ''}`);
  return 'authenticated upstream health OK';
}

async function run(name, fn, { optional = false } = {}) {
  try {
    const detail = await fn();
    if (detail == null && optional) {
      record(name, 'SKIP', 'required secret is not configured in this workflow');
      return;
    }
    record(name, 'PASS', String(detail));
  } catch (error) {
    record(name, 'FAIL', error instanceof Error ? error.message : String(error));
  }
}

await run('WeebCentral relay public health', smokeRelayPublicHealth);
await run('WeebCentral relay upstream health', smokeRelayAuthenticatedHealth, { optional: true });

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map(({ name, status, detail }) => `| ${name} | ${status} | ${detail.replaceAll('|', '\\|')} |`).join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Provider live smoke\n\n| Check | Result | Detail |\n| --- | --- | --- |\n${rows}\n`);
}

if (results.some((item) => item.status === 'FAIL')) process.exitCode = 1;
