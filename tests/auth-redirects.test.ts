import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPasswordRecoveryRedirect,
  isPasswordRecoveryRequest,
  safeLocalPath,
} from "../src/lib/auth/redirects.ts";

test("safeLocalPath accepts only same-origin paths", () => {
  assert.equal(safeLocalPath("/library?filter=reading"), "/library?filter=reading");
  assert.equal(safeLocalPath("//evil.example/path"), "/");
  assert.equal(safeLocalPath("https://evil.example/path"), "/");
  assert.equal(safeLocalPath(null), "/");
});

test("password recovery routes through the server confirmation exchange", () => {
  const url = new URL(buildPasswordRecoveryRedirect("https://pachimanga.frogilab.dev"));
  assert.equal(url.origin, "https://pachimanga.frogilab.dev");
  assert.equal(url.pathname, "/auth/confirm");
  assert.equal(url.searchParams.get("next"), "/auth?recovery=1");
});

test("password recovery query is explicit", () => {
  assert.equal(isPasswordRecoveryRequest("?recovery=1"), true);
  assert.equal(isPasswordRecoveryRequest("?recovery=0"), false);
  assert.equal(isPasswordRecoveryRequest(""), false);
});
