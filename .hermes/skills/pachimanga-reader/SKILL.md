---
name: pachimanga-reader
description: Manga reader implementation for Pachimanga. Use when changing chapter/page loading, reading layouts, auto-scroll, controls, progress persistence, or reader navigation. The reader is the core product surface; reading must feel calm and distraction-free.
---

# Pachimanga Reader

Implementation lives in `src/features/reader/` (`reader-view.tsx`, `reader-state.ts`,
`auto-scroll.ts`, `preload.ts`), `src/hooks/use-auto-scroll.ts`, and
`src/app/reader/[chapterId]/page.tsx`. Physics are documented in `docs/architecture.md`.

## Rules

1. Preserve usable width for vertical long-strip/manhwa content. Never let a
   layout rule collapse page images into a narrow column (known past regression).
2. Auto-scroll is elapsed-time physics (`delta = pxPerSec * elapsedMs / 1000`),
   capped after background/suspend. No frame scheduled while paused; wheel and
   touch-drag pause playback. Keep it that way.
3. Reserve each page's aspect ratio before the image loads; native lazy loading
   for distant pages; preload only the next two image URLs.
4. Progress saves against the authenticated account (Supabase + account-bound
   local cache). Never write anonymous progress; never mix accounts on switch.
5. Reader chrome auto-hides; tap/click toggles controls; keyboard
   (arrows/space/esc) and touch gestures keep working on mobile viewports and
   installed-PWA standalone/fullscreen.
6. Every material reader-layout change is verified against: conventional pages,
   long-strip/manhwa, auto-scroll play/pause, progress restore/save,
   background/suspend recovery without scroll jumps.
7. Loading/error states are explicit with retry; errors never fall back to
   mock/demo content in production paths.
8. Honor `prefers-reduced-motion` for auto-scroll and transitions.
