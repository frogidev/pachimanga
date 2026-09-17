# Reader and installed-PWA hardening

This document records the current reader/PWA behavior after library sync scaling, explicit service-worker update handling, and account-bound offline chapter downloads.

## Current implementation state — 2026-09-17

The reader/offline hardening is merged in production runtime commit `605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6` and deployed as Vercel production `dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN` (`READY`).

User-operated local validation on current `main` passed 94/94 tests, lint, typecheck, and production build. User-operated production smoke passed 9 protected routes and 4 PWA icons.

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

## Planned pre-human-testing improvements

The current reader/PWA implementation is considered stable enough for hardening, but these adjacent product improvements remain planned before broader human testing:

- richer safe diagnostics in Settings;
- explicit Sync now / retry pending sync;
- clearer provider/network/403/429/relay failure presentation with Retry;
- user data JSON export without secrets;
- final accessibility/focus/keyboard/loading-empty-error responsive pass;
- manual per-title chapter refresh + last-checked indication.

See `WORKPLAN.md`.
