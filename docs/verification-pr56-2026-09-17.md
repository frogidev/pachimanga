# PR #56 verification — 2026-09-17

PR #56, `feat: add typed provider errors and manual title refresh`, merged to `main` as:

```text
9fca6f78912a307363e240df45fa71be7feb3450
```

## Implemented

- provider failure classification for offline/network failure, HTTP 403 refusal, HTTP 429 rate limit, relay unavailable, missing/removed content, and generic upstream errors;
- safe user-triggered Retry states for provider failures without bypassing access controls;
- structured safe error responses from chapter and library-refresh APIs;
- explicit per-title chapter refresh for signed-in library entries;
- visible `last_checked_at` information with manual refresh only and no background provider polling;
- unit coverage for provider error classification and HTTP mappings.

## Provider/relay state before editing

Authoritative Railway inspection of project `pachimanga-weebcentral-gateway` (`722771ec-29ab-4e8f-ad24-844f858b5d13`) found production environment `c95a5f91-9178-47df-a486-6893dfadcebf` and service `weebcentral-gateway` (`b66a4551-0f67-4e97-928c-ea084d1d9c90`) with no latest deployment/deployment history and one staged environment change. WeebCentral relay availability was therefore treated as unavailable/unvalidated, not healthy. No direct-provider bypass, anti-bot bypass, or mock production fallback was added.

## Pull-request validation

Head commit:

```text
70d53f863e4907141f433283739d6476bee2a387
```

Observed validation:

- Repository Hygiene run `35240475560`: success;
- Web Quality run `35240475600`: success;
- dependency install: success;
- unit tests: success, including the added provider-error tests;
- ESLint: success;
- TypeScript typecheck: success;
- Next.js production build: success;
- final Vercel preview `dpl_Bwp6RH1VJr5WyiDBpudWGmicEjry`: READY.

## Production verification

Exact production deployment:

```text
deployment: dpl_8uinEKUkt6nNvFm8kVUNJCUt2mWF
commit:     9fca6f78912a307363e240df45fa71be7feb3450
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Post-deploy Vercel error/fatal inspection scoped to `dpl_8uinEKUkt6nNvFm8kVUNJCUt2mWF` returned no matching logs in the inspected window.

The required production smoke invocation was attempted from the current agent execution container:

```text
BASE_URL=https://pachimanga.frogilab.dev node /mnt/data/production-smoke.mjs
```

It failed immediately with `fetch failed` because this execution environment does not currently have a working outbound fetch/DNS path to production. No route assertions ran. This is **not** a passing Production Smoke and must not be represented as one. The earlier user-operated smoke remains historical evidence only.

## Remaining pre-human-testing hardening

Completed and merged so far:

1. safe Settings diagnostics with Copy diagnostics;
2. explicit `Sync now` and retry-pending-sync controls;
3. differentiated provider error UX with safe Retry;
4. per-title manual chapter refresh with last-checked information.

Still required:

- signed-in `Export my data` JSON with allowlisted Library metadata/status, progress, history, and reader settings, excluding credentials/session tokens/secrets/provider cookies;
- final accessibility/UI-state pass covering keyboard navigation, focus visibility, icon labels, Escape/dismiss behavior, reduced motion, loading/empty/error states, and target layouts.

Do not begin native/platform release work. The manual PWA release-candidate evidence listed in `docs/verification-2026-09-17.md` remains incomplete and must not be fabricated.
