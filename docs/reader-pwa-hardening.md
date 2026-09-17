# Reader and installed-PWA hardening

This document records the PWA/reader behavior introduced after the library sync-scaling and explicit service-worker update work.

## Explicit offline chapter pages

Pachimanga does not turn the authenticated application into a general offline shell. Navigation remains network-first and `/api/**` remains outside service-worker caching.

The Reader instead offers an explicit per-chapter page download:

- page image URLs are deduplicated and fetched only after the signed-in user chooses the offline action;
- downloaded image responses live in the dedicated `pachimanga-chapters-v1` Cache Storage cache;
- the service worker checks that cache only for cross-origin image requests and otherwise falls back to the network;
- the chapter cache is separate from the bounded same-origin runtime cache, so a normal PWA update does not evict an explicitly downloaded chapter;
- removing an offline chapter deletes those page URLs from the dedicated cache;
- Settings can clear all downloaded chapter pages and reports the browser storage estimate when supported.

This is deliberately narrower than full offline application navigation. A cold offline launch may still reach the public `/offline` fallback if the authenticated reader route and metadata cannot be fetched. The feature guarantees reuse of explicitly downloaded page bytes when the reader route is available; it does not cache authenticated HTML or provider APIs as a public shell.

## Account isolation

Downloaded chapter images are treated as account-bound local state even though the image URLs themselves are provider resources.

`bindChapterCacheOwner(userId)` stores the active cache owner. When the authenticated account changes, the previous chapter cache is deleted before the new owner is recorded. Sign-out also clears the chapter cache. This mirrors the existing IndexedDB/localStorage account-rebinding boundary and prevents a shared browser profile from exposing the previous account's deliberately downloaded reading material.

## Reader controls and performance

The continuous-scroll reader remains the core model for both conventional manga and long-strip/manhwa chapters. The hardening adds controls without changing that layout contract:

- an imperative top-edge progress bar updates from scroll position without per-frame React state churn;
- mobile previous/next-page tap zones and explicit page controls scroll to existing page elements;
- Page Up/Page Down provide keyboard page navigation while Left/Right continue to navigate chapters;
- a chapter selector is available on larger viewports;
- image decode remains asynchronous and distant pages retain bounded preload/lazy behavior;
- page wrappers use `content-visibility: auto` with intrinsic-size reservation to reduce rendering work for long chapters while preserving full content width;
- auto-scroll remains elapsed-time based, pauses for manual interaction, and stays disabled when reduced motion is requested.

## Screen wake lock

Reader settings include an optional `keepScreenAwake` preference. When enabled and the browser supports the Screen Wake Lock API, the reader requests a screen wake lock only while visible, releases it when the reader unmounts/backgrounds, and reacquires it after returning to the foreground. Unsupported browsers simply omit the active wake-lock behavior.

## Installed-PWA navigation

The mobile shell respects safe-area insets and presents a back affordance on non-root application routes. It uses browser history when available and falls back to the Library root when an installed standalone window has no usable prior history.

The existing explicit service-worker lifecycle remains authoritative: a new worker waits, the app announces an available update, and the user chooses when to reload. Explicit chapter downloads are preserved across that shell/runtime cache rotation.

## Validation expectations

Automated checks protect cache ownership, service-worker routing, bounded preload, auto-scroll, reduced motion, and migration provenance. Physical-device release validation is still required for iPhone/iPad/Android/desktop standalone safe areas, update activation, wake lock support, and offline chapter behavior under real browser storage/network conditions.
