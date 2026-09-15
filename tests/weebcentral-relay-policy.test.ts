import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Relay policy is plain ESM shared with the Node relay process.
import { relayOperationFromUrl, sanitizeRelayQuery, WEEBCENTRAL_ORIGIN } from "../relay/weebcentral/policy.mjs";

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
