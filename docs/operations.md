# Pachimanga production operations

This runbook covers the active PWA/web production path. Native distribution remains deferred and manual-only.

Production UI: `https://pachimanga.frogilab.dev`

## Current operating mode — 2026-09-17

- observed `main`: `b54beabf1b6dcc23a67f977e834487ada595a44f`;
- latest production runtime deployment: `dpl_34FBFiKQBGwfYNNRedyo2ggCFB2Q`, `READY`;
- production runtime commit: `dcc14856863ee3ab7a9877e5c7cd9bf953582c95`;
- the current `main` tip is verification/docs-only and runtime-equivalent to that deployed commit;
- required Repository Hygiene and Web Quality checks are active and passed for the latest merged runtime hardening;
- PR Production Smoke passed against the anonymous production boundary;
- the latest direct post-deploy `node ops/production-smoke.mjs` attempt from the agent container did not run assertions because DNS resolution failed with `EAI_AGAIN`; rerun it from a network-capable environment before release-candidate status;
- Vercel Hobby build-rate capacity can temporarily block preview creation; treat that as a platform blocker, not as permission to skip runtime preview/build evidence.

Do not weaken auth/RLS/account isolation/cache/secret boundaries to work around CI, preview, provider, or platform limitations.

## Standard runtime-change verification

For every `main` change that affects hosted runtime:

1. run `npm ci` and `npm run verify` from an updated local clone or equivalent trusted environment;
2. require the repository's Repository Hygiene and Web Quality checks to pass;
3. require a successful Vercel preview/build signal for runtime changes when the project can produce one;
4. merge only after the branch/diff is reviewed and the repository's active merge rules permit it;
5. confirm the exact intended runtime commit (or runtime-equivalent descendant) reaches a Vercel production deployment in `READY`;
6. run `node ops/production-smoke.mjs` against production;
7. confirm anonymous protected routes still resolve to auth with `Cache-Control: private, no-store`;
8. inspect recent Vercel production `error`/`fatal` logs;
9. if provider/API behavior changed, exercise the implicated source path without using unstable live providers as a general build gate;
10. record exact evidence in the latest dated verification document.

PowerShell smoke:

```powershell
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

## CI and Vercel capacity handling

Keep repository quality signals and platform capacity separate.

- GitHub Repository Hygiene/Web Quality failures are code/repository blockers and must be investigated from the failing job/log.
- A Vercel build-rate/quota failure is a platform-capacity blocker. It does not validate the branch and must not be reclassified as an application pass.
- Do not add redundant workflows merely to work around temporary capacity limits.
- Do not remove security/quality requirements to get a branch merged.
- Preserve `npm run verify` as the local full gate.
- Keep optional browser E2E separate from the merge-critical static gate unless the workplan explicitly promotes it.

When platform capacity returns, rerun the missing hosted evidence against the exact current branch head rather than relying on an older preview.

## Vercel ignored-build policy

`vercel.json` calls `node scripts/vercel-ignore-build.mjs`.

The helper deliberately fails open to continue a build when either comparison SHA is missing/unresolvable or Git comparison fails. It skips only when both SHAs are valid and no hosted-runtime path changed.

This repaired the former `fatal: bad revision ''` failure and preserves Hobby-plan build capacity for real runtime changes.

See `vercel-build-policy.md`.

## Vercel failure triage

Keep these failure classes separate:

1. ignored-build comparison/config failure;
2. Vercel quota/platform failure;
3. application compilation/type/build failure;
4. production runtime failure.

For a build/runtime incident:

- identify deployment ID + Git commit;
- inspect build/runtime logs before changing code;
- reproduce against current `main` or one focused preview;
- fix only the implicated layer;
- re-run local quality checks;
- verify production deployment + smoke + errors after merge.

## WeebCentral relay operations

The relay is operation-limited and must never become an arbitrary proxy.

Public health:

```bash
curl https://wc-relay.frogilab.dev/health
```

Authenticated upstream health requires the private operator token:

```bash
curl -H "Authorization: Bearer $RELAY_TOKEN" https://wc-relay.frogilab.dev/health/upstream
```

Never print/paste the token into source, issues, docs, logs, or chat.

Portainer stack: `pachimanga-relay`.

After relay changes:

1. redeploy/re-pull intentionally in Portainer;
2. wait for the relay container to become healthy;
3. inspect logs for restart/auth/bind failures without exposing secrets;
4. test public `/health`;
5. test `/health/upstream` only from authorized operator context.

If relay/upstream fails, surface an explicit error. Do not add CAPTCHA bypass, credential bypass, arbitrary proxying, or mock content.

## Supabase operational checks

Production project: `gwpgaojsemcfikgynxwv`.

Account-owned synchronized tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

Current safeguards include owner RLS, least-privilege grants, canonical timestamped migrations, newer-only stale-write guards, and an account-bound `SECURITY INVOKER` compact progress summary RPC with no `anon`/`PUBLIC` execute access.

Run security/performance advisor review after schema/RLS/auth changes and before a release-candidate claim. The currently accepted plan-limited warning is leaked-password protection; performance was clean at the latest recorded review.

Do not mutate production merely to investigate. Inspect first, author forward-only migrations, validate, and apply only when production mutation is intentionally authorized.

## Service worker/offline operations

Current production service worker uses:

- network-first navigation;
- `/offline` public fallback;
- no service-worker caching for `/api/**`;
- bounded same-origin runtime cache;
- explicit dedicated chapter-page cache for user-requested offline downloads;
- account ownership rebinding/clearing for offline chapter downloads;
- explicit user activation for new service-worker versions.

Never broaden this into reusable cached authenticated HTML or a public offline copy of private account content.

## Manual-only release boundaries

These require real identities/devices/operator access:

- registration/confirmation/password recovery;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device sync and clock-skew observations;
- installed PWA on iPhone/iPad/Android/desktop;
- service-worker upgrade on an already-installed PWA;
- real-device reader matrix;
- representative private-format import validation using safe disposable samples;
- authenticated relay upstream health;
- native signing/release/distribution.

Do not fabricate completion. Continue only with autonomous work that preserves the required boundaries.

## Current production checkpoint — 2026-09-17 after PR #68

```text
main:       c9060fd177b7d3cdf607cbde1945af875e283fa7
production: dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA
state:      READY
runtime:    c9060fd177b7d3cdf607cbde1945af875e283fa7
```

PR #68 final head passed Repository Hygiene, Web Quality (dependency install, tests, lint, typecheck, production build), and Production Smoke. Vercel preview creation for some branch commits was blocked by the Hobby build-rate limit, but the exact squash merge deployed to production successfully. Error/fatal log inspection scoped to `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` returned no matching entries in the inspected post-deploy window.

Operational implications of the merged performance hardening:

- repeated same-title library refresh requests are coalesced server-side;
- automatic refreshes may reuse a very recent successful check instead of immediately contacting the provider again;
- the refresh route has a hard upper bound so provider stalls do not hold an interactive request for minutes;
- oversized WeebCentral chapter HTML is not written into Next.js Data Cache; parsed results use bounded short-lived process memory and the relay retains its own constrained cache;
- manual per-title refresh remains forceable and does not bypass provider refusal/rate-limit behavior.

Release operations remain PWA-only. Native signing/distribution remains blocked by the release-candidate gate.
