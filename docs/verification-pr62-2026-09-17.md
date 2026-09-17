# PR #62 verification — 2026-09-17

PR #62, `fix: surface live production data instead of placeholder empties`, merged to `main` as:

```text
dcc14856863ee3ab7a9877e5c7cd9bf953582c95
```

## Implemented

- replaced the static `/updates` empty screen with a live signed-in account/provider availability view;
- added protected `/api/library/availability` backed directly by the signed-in user's Supabase/RLS account rows;
- stale source-backed titles are checked on Updates using the existing bounded freshness policy, with explicit `Check all now` for a deliberate full check;
- Updates now shows real account-title counts, provider-backed/local counts, chapter availability, last-checked timestamps, unread update counts, in-progress check state, and typed provider failures;
- Browse now distinguishes idle, live-searching, confirmed zero-result, and search-failure states and no longer advertises ComicK as a validated readable fallback;
- History now distinguishes loading, load failure, confirmed zero stored events, and missing metadata instead of synthesizing a fake manga record;
- Library decorative empty artwork was replaced with explicit confirmed account/filter zero states;
- missing provider covers now stay visibly missing instead of being replaced by synthesized mock cover art;
- Production Smoke now protects `/updates` and `/api/library/availability` as authenticated/private routes;
- regression tests were added for these production-data truthfulness boundaries.

No schema migration, RLS weakening, service-role access, provider bypass, mock production fallback, or native/platform release work was introduced.

## Pull-request validation

Exact PR head:

```text
19028ac4eec67e8eaa502ee84625a19cd2dfe417
```

Observed GitHub validation:

- Repository Hygiene run `35247498278`: success;
- Web Quality run `35247498294`: success;
- the quality job completed dependency install, unit tests, ESLint, TypeScript typecheck, and Next.js production build;
- Production Smoke run `35247498285`: success against the then-current production anonymous boundary;
- no unresolved review threads were present before merge.

Vercel preview history:

- branch preview `dpl_4QUr5AHdNcpi3xY9AD2HHZbbajSa` reached READY for branch commit `1e4a7db322c0f0a51ae384c67b329c6485fe1419`;
- later exact-head preview creation was blocked by Vercel's plan build-rate limit, not by an application compile/runtime error;
- exact-head GitHub Web Quality still completed the production build successfully before merge.

## Production verification

Exact production deployment:

```text
deployment: dpl_34FBFiKQBGwfYNNRedyo2ggCFB2Q
commit:     dcc14856863ee3ab7a9877e5c7cd9bf953582c95
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Vercel build evidence for the exact merge commit:

- hosted-runtime changes were detected, so the build was not skipped;
- dependency installation completed;
- Next.js 16.3.3 compiled successfully;
- TypeScript completed successfully;
- 20/20 static pages generated;
- `/api/library/availability` and `/updates` were present in the built route table;
- deployment reached READY and the production alias attached successfully.

Post-deploy evidence:

- Vercel-side `/auth` fetch returned HTTP 200 with the expected sign-in experience and `Cache-Control: private, no-store`;
- production `error`/`fatal` log inspection scoped to `dpl_34FBFiKQBGwfYNNRedyo2ggCFB2Q` returned no matching entries in the inspected 30-minute window;
- repository search on current `main` found no remaining `Nothing new yet`, `empty-shelves.avif`, or `MockCoverArt` production references.

A fresh direct execution of `node ops/production-smoke.mjs` was attempted from the current agent container after the production deployment. Node fetch failed before route assertions because DNS resolution for `pachimanga.frogilab.dev` returned `EAI_AGAIN`. This is **not** recorded as a passing post-deploy smoke. The successful PR Production Smoke run remains pre-merge boundary evidence; rerun the script from a network-capable environment for final current-runtime evidence.

## Production-test interpretation

The application still has explicit empty states where the live data source has actually returned zero rows/results. Those states are intentional accessibility/usability states, not promotional placeholders. The production test should now distinguish:

- loading versus confirmed zero data;
- account-data failure versus an empty account;
- provider search/check failure versus zero readable results;
- missing provider metadata/cover art versus fabricated fallback content;
- stale/unchecked provider state versus successfully checked current state.

The PWA release-candidate gate remains incomplete until the real account/device/import matrix and a fresh current-runtime Production Smoke are completed. Native/platform release work remains blocked.