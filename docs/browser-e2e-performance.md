# Browser E2E and PWA performance guardrails

Pachimanga separates deterministic merge/local quality checks from optional browser evidence that depends on an installed browser runner or dedicated test identities.

## Current operating mode

GitHub Actions capacity is unavailable for the remainder of the current month. There is no required browser-E2E workflow for this period.

`ops/browser-e2e.mjs` remains an optional evidence runner for environments where Playwright and Chromium are already available. Pachimanga does **not** install Playwright as a project dependency and does not download browser binaries during normal install/build/deploy.

If Playwright is absent, the runner exits with an explicit diagnostic rather than modifying the dependency graph or hanging on browser installation.

## Anonymous browser matrix

When executed, the optional runner verifies:

- `/auth` renders the real sign-in/register experience;
- `/offline` renders the public fallback;
- `/`, `/library`, `/browse`, `/import`, `/history`, and `/settings` resolve to auth without a session;
- 360px phone and 1280px desktop auth/offline layouts do not horizontally overflow.

The HTTP production smoke remains the always-available credential-free boundary check for redirects, cache headers, manifest/icons, and service-worker invariants.

## Optional authenticated browser evidence

The runner can use disposable account environment variables:

- `PACHIMANGA_E2E_EMAIL`
- `PACHIMANGA_E2E_PASSWORD`
- optional account B equivalents.

With account A it can verify two independent contexts bind to the same account cache owner and that sign-out clears the binding. With account B it can exercise A -> B -> A cache-owner changes.

The runner never prints credentials and does not use a service-role key or bypass RLS. Absence of test identities is a skip, not a pass for authenticated evidence.

Real two-device synchronization with meaningful progress/settings mutations remains a manual release-gate test.

## Performance boundaries protected by tests

The deterministic unit suite protects these properties:

1. OCR, SQLite, protobuf, and archive engines stay inside `src/lib/imports/**` rather than leaking into Library/Reader/core routes.
2. Backup engines and Tesseract remain dynamically imported only when their operation is invoked.
3. The service-worker runtime cache has an explicit finite entry cap and trims after writes.
4. Explicit offline chapter pages use a dedicated account-bound cache separate from the runtime shell cache.
5. Long reader pages retain bounded preload/lazy behavior and rendering containment.
6. Library first paint uses compact per-title progress summaries rather than hydrating thousands of chapter-progress rows.

## Verified local evidence — 2026-09-17

User-operated Windows validation on current `main`:

```powershell
npm ci
npm run verify
```

Result:

- 94/94 tests passed;
- lint passed;
- typecheck passed;
- Next.js production build passed;
- `npm ci` reported 0 vulnerabilities.

User-operated production smoke:

```powershell
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

Result:

```text
Production smoke passed for https://pachimanga.frogilab.dev
Protected routes checked: 9
PWA icons checked: 4
```

## Validation without GitHub Actions

For the current period:

1. update local `main`;
2. run `npm ci` + `npm run verify`;
3. require successful Vercel preview/build for runtime-impacting changes;
4. after merge, confirm the exact production runtime deployment reaches `READY`;
5. run production smoke;
6. inspect Vercel runtime `error`/`fatal` logs;
7. run optional browser E2E only when an external Playwright/Chromium environment is already available.

## Remaining physical-device performance evidence

Still manual:

- long-strip memory behavior on low-memory phones/tablets;
- iOS/iPadOS standalone viewport/safe-area behavior;
- service-worker update from an older installed build;
- offline chapter storage/reuse under real network loss;
- Screen Wake Lock support and lifecycle;
- installed-PWA auth/session continuity.

Do not replace these with synthetic claims.
