# Pachimanga production operations

This runbook covers the active PWA/web production path. Native artifact distribution remains deferred and manual-only.

Production UI: `https://pachimanga.frogilab.dev`

## Standard post-deploy verification

For every `main` change that affects hosted runtime:

1. Confirm the intended `main` commit is represented by the latest Vercel production deployment, or by a runtime-equivalent descendant.
2. Wait for that deployment to reach `READY`. GitHub CI success is not proof that production deployment completed.
3. Run the `Production Smoke` workflow or `node ops/production-smoke.mjs` against production.
4. Confirm anonymous protected routes still resolve to the auth experience with `Cache-Control: private, no-store`.
5. Inspect recent Vercel production runtime errors after smoke.
6. If source/API behavior changed, exercise the affected provider path and inspect only the implicated infrastructure layer.
7. Record a blocker rather than claiming production readiness when a deployment is skipped, rate-limited, canceled, stale, or otherwise not `READY`.

`Production Smoke` is credential-free. It verifies the anonymous auth boundary, public auth/offline surfaces, manifest/icons, and service-worker safety markers. Full authenticated account flows still require dedicated test credentials or a real user session.

## Vercel triage

Separate ignored-build logic, platform/quota failures, compilation failures, and runtime failures.

### Ignored-build failure

The repository uses `vercel.json` runtime-path detection to avoid unnecessary Hobby-plan builds.

Known failure mode as of 2026-09-16:

```text
fatal: bad revision ''
```

If a Vercel deployment fails with that message before application compilation:

1. inspect whether `VERCEL_GIT_PREVIOUS_SHA` is empty/unresolvable;
2. inspect `vercel.json` / the ignored-build helper before touching application code;
3. treat missing comparison history as a reason to continue the build, not a reason to error or skip;
4. preserve normal runtime-path filtering when both SHAs are valid;
5. verify the next production deployment reaches `READY` and then run smoke/log checks.

See `vercel-build-policy.md`.

### Build/deploy failure

1. Identify deployment ID and Git commit.
2. Read build logs before modifying code.
3. Distinguish ignored-build/configuration failure from application compilation failure and platform/quota failure.
4. Verify `Web Quality` on the same commit.
5. Fix only the implicated code/configuration.
6. Re-verify the next production deployment reaches `READY`.

### Runtime failure

1. Scope runtime logs/errors to production and the affected deployment/time window.
2. Filter to `error`/`fatal` first; add route/text filters only after the failing surface is known.
3. Do not add logging that prints bearer tokens, Supabase secrets, passwords, or user content.
4. Reproduce against the same route/provider before changing unrelated code.

## WeebCentral relay operations

The web/PWA relay is operation-limited and is not an arbitrary proxy.

Public service health:

```bash
curl https://wc-relay.frogilab.dev/health
```

Authenticated upstream health:

```bash
curl -H "Authorization: Bearer $RELAY_TOKEN" \
  https://wc-relay.frogilab.dev/health/upstream
```

Never paste the relay token into issues, logs, chat transcripts, client variables, or shareable command output.

### Portainer deployment

The homelab relay is managed in Portainer as stack `pachimanga-relay` with container `pachimanga-weebcentral-relay`.

For a relay image update:

1. open Portainer -> Stacks -> `pachimanga-relay`;
2. confirm the existing `RELAY_TOKEN` remains configured without exposing its value;
3. redeploy/update the stack with image re-pull enabled;
4. wait for `pachimanga-weebcentral-relay` to become `healthy`;
5. inspect recent container logs for restart loops, token errors, bind errors, or repeated auth failures;
6. test public `/health`;
7. test authenticated `/health/upstream` from an authorized operator shell.

Publishing a GHCR image does not mean the homelab already runs it. Portainer rollout remains an explicit operational step.

If the relay is unavailable, Pachimanga must surface an explicit WeebCentral error. Do not add mock content, arbitrary proxying, CAPTCHA bypass, credential bypass, or another unsafe fallback.

## Supabase operational checks

Run security/performance advisor reviews:

- after schema/RLS/auth changes;
- after applying a production migration;
- before the PWA release-candidate gate;
- whenever an auth/data-isolation regression is suspected.

Account-owned tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

Current production migration provenance is canonical and mirrored under `supabase/migrations/`; historical `001`/`002`/`003` artifacts live under `supabase/legacy-migrations/` and must not return to the active chain.

Current production conflict semantics reject older/equal updates for progress/history/settings based on their ordering timestamps. Do not remove those guards without a replacement conflict model and tests.

The current Supabase plan does not provide leaked-password protection. The corresponding advisor warning is accepted/documented and is not a release blocker by itself.

Do not mutate production merely to investigate. Inspect first, reproduce, author a forward-only migration if required, validate, then apply only when production mutation is intentionally authorized.

## Incident ownership flow

Use this order to avoid guessing across infrastructure layers:

1. identify the failing user surface and exact route/action;
2. correlate it with current Git commit and Vercel production deployment;
3. check GitHub quality/smoke status and Vercel ignored-build/build/runtime state;
4. if account/data-related, inspect Supabase Auth/RLS/schema/grants/advisors;
5. if provider-specific, inspect that source adapter; inspect the relay only for WeebCentral browser/PWA traffic;
6. reproduce against current `main` or one focused preview;
7. fix on one branch without unrelated cleanup;
8. run the relevant quality gate;
9. merge only when required checks pass;
10. verify production deployment, production smoke, and recent runtime errors after recovery.

## Manual-only boundaries

The following require account-level access, real identities/devices, or explicit operator action and cannot be proven by CI alone:

- Supabase Auth dashboard settings that are plan/account specific;
- full register/confirm/password-reset account E2E;
- same-browser two-account isolation E2E;
- two-session/two-device synchronization E2E;
- installed-PWA testing on iOS/iPadOS/Android/desktop;
- homelab Portainer relay rollout after a new image is published;
- native signing/release/distribution.

GitHub main protection is no longer a manual blocker; the active ruleset is already verified and requires `hygiene` plus `quality`.

When blocked on a manual-only item, keep the blocker explicit and continue only with work that does not weaken the required boundary.