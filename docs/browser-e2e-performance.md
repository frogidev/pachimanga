# Browser E2E and PWA performance guardrails

Pachimanga keeps browser-level evidence separate from merge-critical unit/build checks when the evidence depends on the live production deployment. CI must not require an unstable manga provider or a private production user's credentials in order to merge normal application code.

## Browser E2E operating mode

GitHub Actions capacity is intentionally not assumed for the current operating period. There is no scheduled browser-E2E workflow in the repository.

`ops/browser-e2e.mjs` is an optional evidence runner for an environment where Playwright and Chromium are already available. Pachimanga does not install Playwright as a project dependency and does not download browser binaries during normal `npm install`, build, or deployment. If Playwright is absent, the runner exits with an explicit diagnostic instead of modifying the project dependency graph.

The anonymous matrix verifies:

- `/auth` renders the real sign-in/register experience;
- `/offline` renders its public fallback surface;
- `/`, `/library`, `/browse`, `/import`, `/history`, and `/settings` resolve back to the auth experience without a session;
- 360px phone and 1280px desktop layouts do not horizontally overflow on the auth/offline boundary.

This complements the HTTP production smoke: the HTTP smoke validates redirects, cache headers, manifest/icons, and service-worker source invariants; the optional browser runner validates rendered browser behavior.

## Optional authenticated browser evidence

The runner recognizes dedicated environment variables when a disposable test account is available:

- `PACHIMANGA_E2E_EMAIL`
- `PACHIMANGA_E2E_PASSWORD`
- optionally `PACHIMANGA_E2E_EMAIL_B`
- optionally `PACHIMANGA_E2E_PASSWORD_B`

When account A is available, the runner signs into two independent browser contexts, confirms both establish the same owner-bound cache identity, opens Settings, verifies responsive layout, and signs out while confirming the local cache-owner binding is cleared.

When account B is also available, the runner performs an A -> B -> A sequence in fresh browser contexts and verifies the account-bound cache owner changes for B and returns to A's identity after signing back into A.

The runner never prints credential values. It does not create guest access, use a service-role key, or weaken RLS. Absence of optional test credentials is reported as a skip rather than a fabricated pass for authenticated coverage.

Real two-device synchronization with deliberate data mutations remains a manual/release-candidate test until dedicated disposable test identities and mutation expectations are configured.

## Performance boundaries

The automated unit suite protects three PWA performance properties:

1. OCR, SQLite, protobuf, and archive engines remain inside `src/lib/imports/**` rather than leaking into Library/Reader/core route modules.
2. Backup engines and Tesseract remain dynamically imported only when their corresponding import/OCR operation is invoked.
3. The service-worker runtime cache keeps an explicit finite entry cap and trims after writes.

The Reader additionally uses bounded page preload plus `content-visibility: auto`/intrinsic-size containment for distant page wrappers. Library cards use compact server-side progress summaries and incremental rendering instead of hydrating thousands of chapter-progress rows before first paint.

These are regression guardrails rather than synthetic performance scores. Physical-device profiling is still required for final long-strip memory behavior, iOS standalone viewport behavior, and low-memory device limits.

## Validation without GitHub Actions

For the current period, the practical gate is:

1. run the repository quality gate (`npm verify`) in an environment with project dependencies installed;
2. require a successful Vercel preview/build for hosted-runtime changes;
3. run `node ops/production-smoke.mjs` against the deployed target after production deployment;
4. inspect Vercel runtime errors/fatals after deployment;
5. run `ops/browser-e2e.mjs` only when an external Playwright/Chromium environment is available.

Required GitHub branch rules are not weakened merely because Actions quota is unavailable. If repository protection requires an unavailable check, treat merge as blocked rather than bypassing the control.

## Production smoke maintenance

`ops/production-smoke.mjs` tests behavior/invariants instead of depending on one exact service-worker implementation expression. In particular, it accepts the current shell-cache form of the `/offline` fallback while still requiring:

- navigation handling;
- `/api/**` exclusion;
- offline fallback;
- bounded runtime cache;
- explicit chapter-cache boundary.

When service-worker architecture changes, update both the smoke and the architecture documentation in the same workstream instead of suppressing a failing production signal.
