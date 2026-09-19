# Browser E2E and PWA performance guardrails

Pachimanga separates deterministic repository quality checks from optional browser evidence that depends on an installed browser runner or dedicated test identities.

## Current operating mode

PWA/web v0.4.0 is released. Repository Hygiene and Web Quality remain the normal required checks, but GitHub Actions capacity is unavailable through September 30, 2026 and is expected to return October 1. During the outage, use trustworthy local tests/lint/typecheck/build plus exact-head Vercel build evidence where relevant; absent Actions are not represented as passing. Re-check actual Actions availability on or after October 1.

`ops/browser-e2e.mjs` remains optional evidence for environments where Playwright and Chromium are already available. Pachimanga does not install Playwright as a normal project dependency and does not download browser binaries during standard install/build/deploy.

If Playwright is absent, the runner exits with an explicit diagnostic rather than modifying the dependency graph.

## Anonymous browser matrix

The optional runner covers the real auth/offline boundary and protected application routes, including `/account` compatibility behavior. The HTTP Production Smoke remains the credential-free boundary check for redirects, cache headers, manifest/icons, and service-worker invariants.

## Optional authenticated browser evidence

Disposable account environment variables may be supplied to exercise signed-in Settings account controls and account-cache ownership. Credentials are never printed and no service-role bypass is used.

Real two-device synchronization and Account A -> B -> A isolation remain manual post-release evidence even when optional browser automation passes.

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

## v0.4.0 release verification — 2026-09-18

```text
release runtime: 9e0cc7c379541db0d640ebe03383466c37d933ba
production:   dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5
state:        READY
preview:      dpl_46qhkopEh5HNFUyxNgBzA6P6djeZ (READY)
```

The operator reported the final local unit tests, lint, typecheck, and production build passing. Vercel independently compiled the production build, completed TypeScript, generated 22/22 static pages, and deployed successfully. Production error/fatal inspection was empty in the inspected window.

GitHub Actions capacity was unavailable and is not claimed as passing release evidence.

## Feedback-driven measurement

When user feedback reports slowness, hangs, repeated requests, excessive memory, or installed-PWA problems, measure the implicated path before broad optimization. Prefer one focused reproduction and one coherent fix batch. Owner-side reproduction/validation commands should be paste-ready PowerShell for `F:\LF\pachimanga`.

## Post-release Web Vitals attribution fix — 2026-09-18

Production telemetry on the v0.4.0 runtime showed identical CLS and INP samples being emitted under multiple route classes during the same navigation sequence. That pattern was sufficient to establish duplicate/misattributed telemetry, but not to conclude that every labeled route independently had the same layout shift.

Next.js 16.3.3 installs Web Vitals observers from an effect keyed by the reporting callback. Pachimanga previously created that callback inline while also subscribing to `usePathname()`, so each soft navigation changed the callback identity and registered another observer. The reporter now snapshots the coarse route class once per hard page load and passes a stable callback to `useReportWebVitals`.

This preserves the existing privacy boundary and makes hard-navigation metrics useful again:

- account/content identifiers remain excluded;
- the metric ID remains excluded from the server log payload;
- one page-load sample is no longer relabeled as every route visited later in the session;
- route-specific CLS conclusions should use telemetry collected after this fix rather than the duplicated pre-fix samples.

Client-side soft-navigation Web Vitals are not inferred from these hard-navigation samples.

### Validation

```text
merged runtime: 58b6df6bfc76400081ae38ef381d26558a875ac9
production:     dpl_6LUeSkd1vdjRtVKXbj99Kwk78Wjt
state:          READY
```

PR #77 `hygiene` and `quality` completed successfully; the quality job ran unit tests, lint, typecheck, and production build. Vercel compiled the merged runtime successfully and generated 22/22 static pages. Post-deploy Vercel error/fatal inspection was empty in the inspected window.

On 2026-09-19, the operator ran the credential-free Production Smoke against `https://pachimanga.frogilab.dev` from local `main` at the merged SHA. It passed all 12 protected-route checks and all 4 PWA icon checks.

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
