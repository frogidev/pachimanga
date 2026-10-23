import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
// @ts-expect-error Relay policy is plain ESM shared with the Node relay process.
import { ALLOWED_UPSTREAM_ORIGINS, extractPageImageUrls, isProxyableImageUrl, relayOperationFromUrl, sanitizeRelayQuery, WEEBCENTRAL_ORIGIN, ZONATMO_ORIGIN } from "../relay/weebcentral/policy.mjs";

const VALID_ID = "01J123456789ABCDEFGHJKMNP";

function op(path: string) {
  return relayOperationFromUrl(new URL(path, "https://relay.example"));
}

test("relay query normalization removes punctuation and caps length", () => {
  assert.equal(sanitizeRelayQuery("  One-Piece!!!  "), "One Piece");
  assert.equal(sanitizeRelayQuery("x".repeat(150)).length, 100);
});

test("relay only maps known operations to the fixed WeebCentral origin", () => {
  for (const path of [
    `/v1/manga/${VALID_ID}`,
    `/v1/chapters/${VALID_ID}`,
    `/v1/chapter/${VALID_ID}`,
    `/v1/pages/${VALID_ID}`,
    "/v1/search?q=One%20Piece",
  ]) {
    const spec = op(path);
    assert.ok(spec);
    assert.equal(new URL(spec.url).origin, WEEBCENTRAL_ORIGIN);
  }
});

test("relay rejects arbitrary destinations and unsupported operations", () => {
  assert.equal(op("/v1/proxy?url=https://example.com"), null);
  assert.equal(op(`/v1/manga/${VALID_ID}?url=https://example.com`)?.url.includes("example.com"), false);
  assert.equal(op(`/v1/delete/${VALID_ID}`), null);
});

test("relay rejects malformed and lowercase ids", () => {
  assert.equal(op("/v1/manga/not-an-id"), null);
  assert.equal(op(`/v1/manga/${VALID_ID.toLowerCase()}`), null);
});

test("search ignores caller attempts to inject an upstream URL", () => {
  const spec = op("/v1/search?q=https%3A%2F%2Fevil.example%2Fsecret");
  assert.ok(spec);
  assert.equal(new URL(spec.url).origin, WEEBCENTRAL_ORIGIN);
  assert.equal(spec.url.includes("evil.example"), false);
});

test("relay maps only known ZonaTMO operations to the fixed ZonaTMO origin", () => {
  const cases: Array<[string, string]> = [
    ["/v1/zonatmo/search?q=Blue%20Lock", `${ZONATMO_ORIGIN}/biblioteca?title=Blue+Lock`],
    ["/v1/zonatmo/series/4215", `${ZONATMO_ORIGIN}/library/manga/4215/x`],
    ["/v1/zonatmo/reader/1089469", `${ZONATMO_ORIGIN}/view_uploads/1089469`],
  ];
  for (const [path, upstream] of cases) assert.equal(op(path)?.url, upstream);
  assert.ok(ALLOWED_UPSTREAM_ORIGINS.includes(ZONATMO_ORIGIN) && ALLOWED_UPSTREAM_ORIGINS.includes(WEEBCENTRAL_ORIGIN));
});

test("relay rejects malformed ZonaTMO ids, unknown operations and URL injection", () => {
  for (const path of [
    "/v1/zonatmo/series/abc",
    "/v1/zonatmo/series/1234567890",
    "/v1/zonatmo/series/12/../../x",
    "/v1/zonatmo/proxy?url=https://evil.example",
    "/v1/zonatmo/search",
    "/v1/zonatmo/search?q=%21%21",
  ]) assert.equal(op(path), null, path);
  const search = op("/v1/zonatmo/search?q=https%3A%2F%2Fevil.example");
  assert.ok(search);
  assert.equal(new URL(search.url).origin, ZONATMO_ORIGIN);
  assert.equal(search.url.includes("evil.example"), false);
});

test("relay only considers public https image URLs for the image operation", () => {
  assert.equal(isProxyableImageUrl("https://scans-hot.planeptune.us/manga/A/0001.png"), true);
  for (const bad of [
    "http://scans-hot.planeptune.us/manga/A/0001.png",
    "https://127.0.0.1/a.png",
    "https://localhost/a.png",
    "https://printer.local/a.png",
    "https://user:pass@scans.example/a.png",
    "https://scans.example:8443/a.png",
    "https://scans.example/not-an-image.html",
    "https://[::1]/a.png",
    "not a url",
  ]) assert.equal(isProxyableImageUrl(bad), false, bad);
});

test("relay lists only the page images a WeebCentral pages response points at", () => {
  const html = [
    '<img src="https://scans-hot.planeptune.us/manga/A/0001.png" alt="p1">',
    '<img data-src="/relative/0002.webp">',
    '<img src="https://evil.example/a.html">',
    '<img src="https://cdn.example/logo.png">',
    '<img src="http://insecure.example/0003.png">',
  ].join("");
  assert.deepEqual(extractPageImageUrls(html), [
    "https://scans-hot.planeptune.us/manga/A/0001.png",
    "https://weebcentral.com/relative/0002.webp",
  ]);
});

test("the relay serves images only after a pages response listed them", () => {
  const server = readFileSync(join(process.cwd(), "relay/weebcentral/server.mjs"), "utf8");
  assert.ok(server.includes("if (spec.operation === 'pages') registerImages(body);"));
  assert.ok(server.includes("if (spec.operation === 'pages') registerImages(cached.body);"));
  assert.ok(server.includes("!imageAllowed(target)"));
  assert.ok(server.includes("redirect: 'manual'"));
  assert.ok(server.includes("IMAGE_MAX_BYTES"));
});

test("the app image route is authenticated and relay-only, and export falls back to it", () => {
  const route = readFileSync(join(process.cwd(), "src/app/api/source/image/route.ts"), "utf8");
  assert.ok(route.includes("auth.getUser()"));
  assert.ok(route.includes("isRelayConfigured()"));
  assert.ok(route.includes("private, no-store"));
  const exporter = readFileSync(join(process.cwd(), "src/lib/offline/chapter-export.ts"), "utf8");
  assert.ok(exporter.includes("/api/source/image?u="));
  assert.ok(exporter.includes("primeRelayImages"));
});
