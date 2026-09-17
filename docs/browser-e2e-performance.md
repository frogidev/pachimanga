# Browser E2E and PWA performance guardrails

Pachimanga separates deterministic repository quality checks from optional browser evidence that depends on an installed browser runner or dedicated test identities.

## Current operating mode

Repository Hygiene and Web Quality are active required checks. Web Quality runs dependency installation, unit tests, lint, typecheck, and the Next.js production build for runtime-impacting PRs.

`ops/browser-e2e.mjs` remains optional evidence for environments where Playwright and Chromium are already available. Pachimanga does not install Playwright as a normal project dependency and does not download browser binaries during standard install/build/deploy.

If Playwright is absent, the runner exits with an explicit diagnostic rather than modifying the dependency graph.

## Anonymous browser matrix

The optional runner covers the real auth/offline boundary and protected application routes, including `/account` compatibility behavior. The HTTP Production Smoke remains the credential-free boundary check for redirects, cache headers, manifest/icons, and service-worker invariants.

## Optional authenticated browser evidence

Disposable account environment variables may be supplied to exercise signed-in Settings account controls and account-cache ownership. Credentials are never printed and no service-role bypass is used.

Real two-device synchronization and Account A -> B -> A isolation remain manual release-gate evidence even when optional browser automation passes.

## Performance boundaries protected by code/tests

The deterministic suite now protects these properties:

1. heavy OCR/SQLite/protobuf/archive engines remain lazy and isolated to import flows;
2. service-worker runtime cache has a finite cap and explicit account-bound offline chapter storage remains separate;
3. long reader pages retain bounded preload/lazy rendering behavior;
4. large libraries use compact account-bound progress summaries rather than hydrating all chapter progress;
5. sync-status surfaces share one visibility-aware observer and pending queue counts use IndexedDB `count()` instead of loading outbox payloads;
6. concurrent same-title provider refreshes are coalesced;
7. automatic provider checks can reuse a very recent stored refresh rather than immediately repeating network work;
8. provider refresh has a hard overall timeout so an interactive request cannot remain blocked for multiple minutes;
9. WeebCentral raw chapter HTML is not inserted into Next.js Data Cache when it can exceed the framework cache item limit; parsed chapter lists use bounded short-lived in-process caching and in-flight coalescing.

These changes were motivated by local development evidence showing repeated `/api/library/refresh` requests around 500–1000 ms, several provider stalls lasting roughly 110–140 seconds, and WeebCentral chapter payloads around 2.96 MB exceeding the Next.js Data Cache item limit.

## PR #68 verification — 2026-09-17

Final PR head:

```text
0e4fdb5eefd2f870c9e47435ac40ccec9735ff92
```

Observed required checks:

- Repository Hygiene: success;
- Web Quality: success;
- dependency installation: success, 0 vulnerabilities;
- unit tests: success;
- lint: success;
- typecheck: success;
- Next.js production build: success;
- Production Smoke PR gate: success.

Merged runtime:

```text
main:       c9060fd177b7d3cdf607cbde1945af875e283fa7
production: dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA
state:      READY
```

Vercel preview creation was intermittently rate-limited by the Hobby plan during the branch, but the exact merged runtime deployed successfully. Post-deploy error/fatal inspection for the exact production deployment returned no matching logs in the inspected window.

## What still needs measurement

Code-level changes reduce redundant work, but they do not replace measurement. During local/manual testing, capture:

- warm navigation latency;
- number of `POST /api/library/refresh` calls produced by normal navigation;
- refresh latency for MangaDex and WeebCentral titles;
- behavior when the relay/upstream is slow or unavailable;
- memory behavior for very large WeebCentral chapter lists;
- Library/History/Updates behavior with a realistically large signed-in account.

A healthy warm local session should not show multi-minute interactive refresh requests or repeated cache-size warnings.

## Remaining physical-device evidence

Still manual:

- long-strip memory behavior on low-memory phones/tablets;
- iOS/iPadOS standalone viewport and safe-area behavior;
- service-worker update from an older installed build;
- offline chapter storage/reuse under real network loss;
- Screen Wake Lock support/lifecycle;
- installed-PWA auth/session continuity.

Do not replace these with synthetic claims.
