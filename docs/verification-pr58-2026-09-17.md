# PR #58 verification — 2026-09-17

PR #58, `feat: add signed-in account data export`, merged to `main` as:

```text
3caa3d1bc6841f6c7be8223961e1c98c2a0d04cd
```

## Implemented

- protected signed-in JSON account export at `/api/account/export`;
- deterministic pagination in 500-row pages for Library, reading progress, and reading history so large accounts are not silently truncated;
- explicit field selection for Library metadata/status, progress, history, and reader settings;
- reader-settings allowlist before serialization;
- Settings `Export my data` control with download, success, and error states;
- `private, no-store`, attachment disposition, and `nosniff` response headers.

The export intentionally excludes the auth user/session objects, account user ID, email address, password, access/refresh tokens, service-role data, relay secrets, provider cookies, and arbitrary database columns. Existing Supabase RLS remains authoritative and all account-table queries are scoped to the authenticated user.

## Pull-request validation

Head commit:

```text
344fbc7e0adb164d07ebeb67bfba0bd3c5cc44e2
```

Observed validation:

- required `hygiene` check: success;
- required `quality` check: success;
- dependency install / unit suite / ESLint / TypeScript / Next.js production build completed within the successful quality gate;
- final Vercel preview `dpl_9rpgvXTw8agH4fxo4nBaqdrLZz4v`: READY.

## Production verification

Exact production deployment:

```text
deployment: dpl_4fbxsNgb5AKQQ1nN8oRkBeZEnjkA
commit:     3caa3d1bc6841f6c7be8223961e1c98c2a0d04cd
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Post-deploy Vercel error/fatal inspection scoped to `dpl_4fbxsNgb5AKQQ1nN8oRkBeZEnjkA` returned no matching logs in the inspected 30-minute window.

The required production smoke invocation was attempted from the current agent execution container:

```text
BASE_URL=https://pachimanga.frogilab.dev node /mnt/data/production-smoke.mjs
```

It failed immediately with `fetch failed` because the current container does not have a working outbound fetch/DNS path to production. No smoke assertions ran. This is **not** a passing Production Smoke and must not be represented as one.

## Pre-human-testing hardening state

Implemented and merged:

1. safe Settings diagnostics with Copy diagnostics;
2. explicit `Sync now` and retry-pending-sync controls;
3. differentiated provider error UX with safe Retry;
4. signed-in account JSON export;
5. per-title manual chapter refresh with last-checked information.

Still required before the six-item pre-human hardening workstream is complete:

- final accessibility/UI-state pass covering keyboard navigation, focus visibility, accessible icon labels, Escape/dismiss behavior, reduced motion, loading/empty/error states, and layouts at 320/360/390/768/1280px.

Manual PWA release-candidate evidence remains pending. Do not begin native/platform release work.
