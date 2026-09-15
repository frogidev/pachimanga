# Pachimanga production operations

This runbook covers the active PWA/web production path. Native artifact distribution remains deferred and manual-only.

Production UI: `https://pachimanga.frogilab.dev`

## Standard post-deploy verification

For every `main` change that affects the hosted runtime:

1. Confirm the intended `main` commit is the commit attached to the latest Vercel production deployment.
2. Wait for that deployment to reach `READY`. Do not treat GitHub CI success as proof that the production deployment completed.
3. Run the `Production Smoke` workflow or `node ops/production-smoke.mjs` against production.
4. Confirm anonymous protected routes still redirect to `/auth` with `Cache-Control: private, no-store`.
5. Inspect recent Vercel runtime logs for `error`/`fatal` entries scoped to the deployed production deployment.
6. If source/API behavior changed, exercise the affected provider path and inspect only the implicated infrastructure layer.
7. Record a blocker rather than claiming production readiness when a deployment is skipped, rate-limited, canceled, or otherwise not `READY`.

`Production Smoke` is intentionally credential-free. It verifies the anonymous auth boundary, public offline/auth surfaces, manifest/icons, and service-worker safety markers. Authenticated account flows still require dedicated test credentials or a real user session.

## Vercel triage

Separate build failures from runtime failures.

### Build/deploy failure

1. Identify deployment ID and Git commit.
2. Read build logs before modifying code.
3. Distinguish application failure from platform/quota failure such as Hobby build-rate limiting.
4. Verify `Web Quality` on the same commit.
5. Fix only the implicated code/configuration.
6. Re-verify the next production deployment reaches `READY`.

### Runtime failure

1. Scope runtime logs to production and the affected deployment.
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

Never paste the relay token into issues, logs, chat transcripts, client variables, or command output intended for sharing.

The GitHub `WeebCentral Relay` workflow validates the relay and publishes a container image on eligible `main` changes. Publishing the image does not mean the homelab is already running it. Homelab update remains an explicit operational step:

```bash
cd /opt/pachimanga-relay
docker compose pull
docker compose up -d
curl http://127.0.0.1:8787/health
```

Then verify the external `/health` and authenticated `/health/upstream` endpoints.

If the relay is unavailable, Pachimanga should surface an explicit WeebCentral error. Do not add mock content, arbitrary proxying, CAPTCHA bypass, credential bypass, or another unsafe fallback.

## Supabase operational checks

Run security/performance advisor reviews:

- after schema/RLS/auth changes;
- after applying a production migration;
- before the PWA release-candidate gate;
- whenever an auth/data isolation regression is suspected.

For account-owned data, verify RLS remains enabled on:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

Production migration provenance and the current clean-room bootstrap limitation are documented in `../supabase/README.md`.

Do not mutate production merely to investigate. Inspect first, reproduce, author a forward-only migration if required, validate, then apply only when production mutation is intentionally authorized.

## Incident ownership flow

Use this order to avoid guessing across infrastructure layers:

1. Identify the failing user surface and exact route/action.
2. Correlate it with the current Git commit and Vercel deployment.
3. Check GitHub quality/smoke status and Vercel build/runtime logs.
4. If the failure is account/data-related, inspect Supabase Auth/RLS/schema/advisors.
5. If it is provider-specific, inspect that source adapter; inspect the relay only for WeebCentral browser/PWA traffic.
6. Reproduce against current `main` or a focused preview.
7. Fix on one branch; do not combine unrelated cleanup.
8. Run the relevant full quality gate.
9. Merge only when green.
10. Verify production deployment, production smoke, and recent error/fatal logs after recovery.

## Escalation / manual-only boundaries

The following require account-level access, real credentials/devices, or explicit operational action and cannot be inferred from CI alone:

- GitHub `main` ruleset/branch-protection administration;
- Supabase Auth settings such as leaked-password protection and redirect policy;
- full register/confirm/password-reset account E2E;
- two-account/two-device isolation/synchronization E2E;
- installed-PWA testing on iOS/iPadOS/Android/desktop;
- homelab relay container rollout after a new GHCR image is published;
- native signing/release/distribution.

When blocked on one of these, keep the blocker explicit and continue only with work that does not weaken the required boundary.
