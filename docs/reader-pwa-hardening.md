# Reader and installed-PWA hardening

This document records the current reader/PWA behavior after library sync scaling, explicit service-worker update handling, and account-bound offline chapter downloads.

## Current implementation state — 2026-09-17

The reader/offline hardening is present in production runtime commit `c9060fd177b7d3cdf607cbde1945af875e283fa7` and deployed as Vercel production `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` (`READY`).

PR #68 final Web Quality passed dependency installation, unit tests, lint, typecheck, and production build. Its Production Smoke gate also passed. A fresh direct post-merge smoke against the exact production runtime remains manual evidence if it has not yet been rerun from a network-capable environment.

Physical installed-device validation remains outstanding and must not be inferred from these automated/local checks.

## Explicit offline chapter pages

Pachimanga does not turn the authenticated application into a general offline shell. Navigation remains network-first and `/api/**` remains outside service-worker caching.

The Reader offers explicit per-chapter page download:

- page image URLs are deduplicated;
- downloaded image responses live in `pachimanga-chapters-v1`;
- cross-origin manga image requests can be satisfied from that explicit cache;
- normal PWA shell/runtime updates do not evict saved chapter pages;
- removing a chapter deletes its saved page URLs;
- Settings can clear all saved chapter pages;
- browser storage estimate is shown where supported.

A cold offline launch may still reach `/offline` if authenticated route/metadata cannot be fetched. Pachimanga does not cache authenticated HTML or provider APIs as a public shell.

## Account isolation

Downloaded chapter pages are account-bound local state. `bindChapterCacheOwner(userId)` records the active owner. Account changes/sign-out delete the previous owner's chapter cache before rebinding/clearing ownership.

This mirrors the IndexedDB/localStorage ownership boundary and prevents a shared browser profile from exposing another account's deliberately downloaded pages.

## Reader controls and performance

The continuous-scroll reader remains the common layout model for conventional manga and long-strip/manhwa.

Current controls/performance behavior:

- imperative top-edge progress bar;
- previous/next page controls and mobile tap zones;
- Page Up/Page Down page navigation;
- Left/Right chapter navigation;
- chapter selector on larger layouts;
- asynchronous image decode and bounded preload/lazy behavior;
- `content-visibility: auto` plus intrinsic-size reservation for distant pages;
- elapsed-time auto-scroll with background-stall cap;
- pause on manual wheel/touch interaction where applicable;
- reduced-motion protection;
- exact local pixel resume with synchronized percentage fallback.

## Screen Wake Lock

Optional `keepScreenAwake` requests Screen Wake Lock only when supported and the reader is visible. It releases on background/unmount and may reacquire after returning to the foreground.

Unsupported browsers degrade normally.

## Installed-PWA navigation and updates

- shell respects safe-area insets;
- non-root application routes expose back navigation;
- standalone windows fall back to Library if no usable prior history exists;
- new service workers wait instead of replacing an active reading session;
- app presents `Update & reload`;
- only explicit user action activates the waiting worker;
- explicit chapter downloads survive shell/runtime cache rotation.

## Validation still required on physical devices

- iPhone Safari Add to Home Screen;
- iPad standalone;
- Android Chrome installed PWA;
- desktop Chromium installed PWA;
- safe areas and standalone back navigation;
- virtual keyboard/viewport behavior;
- update from an older installed service worker;
- offline chapter reuse after real network loss;
- account switch/sign-out while offline downloads exist;
- Screen Wake Lock lifecycle;
- long-strip memory behavior on low-memory devices;
- conventional reader first/middle/last pages;
- auto-scroll interruption and reduced-motion behavior.

## Adjacent PWA hardening now implemented

The previously planned Settings diagnostics, manual sync/retry controls, provider error UX, account-data export, accessibility/state pass, and per-title provider refresh are implemented. PR #68 additionally consolidated account/security controls into Settings, moved theme selection to a shell quick toggle, placed Sign out last, and reduced redundant sync/provider refresh work.

Remaining work is the real-account/device/import release-candidate matrix in `WORKPLAN.md`, not a new autonomous feature-expansion phase.
