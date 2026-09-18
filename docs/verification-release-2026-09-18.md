# Pachimanga v0.4.0 release verification — 2026-09-18

This document records the PWA/web v0.4.0 release decision and the evidence actually observed. It intentionally distinguishes verified facts from manual evidence that remains outstanding.

## Release identity

```text
release:             v0.4.0
production URL:      https://pachimanga.frogilab.dev
release main/runtime:9e0cc7c379541db0d640ebe03383466c37d933ba
production deploy:   dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5
production state:    READY
PR #74 final head:   e2f4b0a263ec79736be699ad704fe33b2211f1f1
final preview:       dpl_46qhkopEh5HNFUyxNgBzA6P6djeZ
preview state:       READY
```

The owner explicitly designated this state as the PWA/web release.

## Included release batches

- PR #72: PWA integrity/scale/sync/library hardening, collections, export/import round trip, search deduplication, richer reading statistics, logical clock hardening, library mutation outbox, quota-aware/cancellable offline chapter saving, privacy-safe Web Vitals telemetry, chapter publication dates, provider/import/security hardening.
- PR #73: warm-paper light-theme surfaces/contrast and regression coverage.
- PR #74: display-name/avatar identity in desktop/mobile shell, Settings profile preview/live refresh, readable light-theme auth hero, browser autofill theme correction, and React effect lint correction.

## Local validation

The operator reported the final PR #74 branch passed:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

Earlier observed output in the same release sequence included 135/135 tests, clean lint/typecheck, and a successful Next.js production build. The final post-fix gate is recorded as operator-reported evidence rather than re-executed by the agent.

GitHub Actions capacity is unavailable through September 30, 2026 and is expected to return October 1. Missing/skipped hosted Action runs are not treated as passing evidence, and repository/security rules were not intentionally weakened as part of the release work. Future work should re-check actual availability on or after October 1.

## Vercel evidence

Exact PR #74 preview:

```text
deployment: dpl_46qhkopEh5HNFUyxNgBzA6P6djeZ
commit:     e2f4b0a263ec79736be699ad704fe33b2211f1f1
state:      READY
```

Exact production release:

```text
deployment: dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5
commit:     9e0cc7c379541db0d640ebe03383466c37d933ba
target:     production
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Observed production build evidence:

- Next.js 16.3.3;
- optimized production build compiled successfully;
- TypeScript completed successfully;
- 22/22 static pages generated;
- Vercel build output completed successfully.

Warnings were limited to the existing Node `engines >=22` future-major warning and npm `allow-scripts` notices for protobufjs, tesseract.js, and unrs-resolver.

Post-deploy runtime log inspection for `error` and `fatal` returned no matching entries in the inspected one-hour window.

## Supabase release state

Production migration `20260918010000_pwa_collections_profile_and_clear_rpc.sql` is applied.

It adds:

- `profiles.avatar_url` and profile length/HTTPS constraints;
- account-owned `library_collections`;
- account-owned `library_collection_items`;
- owner RLS and authenticated-only grants;
- `clear_my_library()` as a `SECURITY INVOKER`, authenticated-only transactional clear path.

Production inspection confirmed RLS on the new account-owned tables. The latest observed advisors retained the known leaked-password-protection warning and reported the new collection lookup index as unused while the tables were still empty; neither was treated as evidence of an application failure.

## Security/product invariants retained

- normal application use requires authentication;
- no guest/demo/production mock reader path;
- account-owned tables remain owner-RLS protected;
- browser-local state/offline chapter data remain account-bound;
- authenticated content is not converted into a reusable public PWA shell;
- WeebCentral relay/native bridges remain operation-limited;
- provider 403/429/CAPTCHA/auth/anti-bot controls are not bypassed;
- browser code contains publishable Supabase credentials only.

## Evidence explicitly not claimed

The following were not fully observed for the exact release runtime and remain post-release validation backlog:

- fresh exact-runtime credential-free `ops/production-smoke.mjs` from a network-capable execution environment;
- complete live signed-in production-data matrix;
- full Account A -> B -> A isolation matrix;
- two-device synchronization and clock-skew matrix;
- installed PWA device matrix;
- physical-device conventional/long-strip reader matrix;
- representative OCR/Tachiyomi/Mihon/Tachimanga import matrix.

The release designation is an explicit owner product decision; it is not a statement that these unobserved checks were performed.

## Release baseline

Future work should treat `9e0cc7c379541db0d640ebe03383466c37d933ba` / `dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5` as the v0.4.0 hosted-runtime baseline unless a later current-state document records a newer release.


## Post-release workflow note

After v0.4.0, the default product-development mode is user-feedback-driven improvement. This does not alter the release evidence above.

- prioritize reproducible bugs, UX friction, reliability/performance, accessibility, and responsive/theme regressions;
- proceed autonomously on clear safe fixes;
- batch related feedback to minimize Vercel churn;
- keep responses concise;
- when owner-side local testing is needed, provide exact paste-ready PowerShell rooted at `F:\LF\pachimanga`;
- preserve every security/account/provider boundary documented for the release.

See `post-release-feedback.md`.
