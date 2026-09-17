# Pachimanga production operations

This runbook covers the active PWA/web production path. Native distribution remains deferred and manual-only.

Production UI: `https://pachimanga.frogilab.dev`

## Current operating mode — 2026-09-17

- observed `main`: `ef67bc255134ec9bf033846bb8d062131195c715`;
- latest production runtime deployment: `dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN`, `READY`;
- production runtime commit: `605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6`;
- PR #52 is tests/ops/docs only and does not require a new hosted-runtime deployment;
- user-operated local `npm run verify` passed 94/94 tests, lint, typecheck, and production build;
- user-operated production smoke passed 9 protected routes and 4 PWA icons;
- GitHub Actions capacity is unavailable for the remainder of the current month.

Do not weaken auth/RLS/account isolation/cache/secret boundaries as a substitute for unavailable Actions.

## Standard runtime-change verification

For every `main` change that affects hosted runtime:

1. run `npm ci` and `npm run verify` from an updated local clone or equivalent trusted environment;
2. require a successful Vercel preview/build signal when available;
3. merge only after the branch/diff is reviewed and the repository's active merge rules permit it;
4. confirm the exact intended runtime commit (or runtime-equivalent descendant) reaches a Vercel production deployment in `READY`;
5. run `node ops/production-smoke.mjs` against production;
6. confirm anonymous protected routes still resolve to auth with `Cache-Control: private, no-store`;
7. inspect recent Vercel production `error`/`fatal` logs;
8. if provider/API behavior changed, exercise the implicated source path without using unstable live providers as a general build gate;
9. record exact evidence in the latest dated verification document.

PowerShell smoke:

```powershell
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

## GitHub Actions monthly limitation

Actions workflows remain in the repository, but capacity is currently unavailable. During this period:

- do not wait indefinitely for Actions jobs that cannot run;
- do not add workflows solely to compensate;
- do not remove security/quality requirements from code or tests;
- preserve `npm run verify` as the local full gate;
- use Vercel as the hosted build/deployment signal;
- use direct production smoke and Vercel runtime logs for post-deploy evidence;
- treat optional browser E2E separately from the merge-critical local gate.

When Actions capacity returns, re-evaluate ruleset/check behavior before assuming previous required-check configuration is still active.

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
