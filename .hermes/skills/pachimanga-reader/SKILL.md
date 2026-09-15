---
name: pachimanga-reader
description: Strict manga-reader workflow for Pachimanga. Use when changing chapter/page loading, long-strip or paged layouts, auto-scroll, reader controls, preload/lazy loading, progress/history persistence, offline outbox/reconnect behavior, read-state controls, or reader navigation. Reader changes require conventional + long-strip regression proof, account isolation, reduced-motion/accessibility checks, and the full web quality gate.
---

# Pachimanga reader

The reader is the core product surface. Read `AGENTS.md`, `docs/architecture.md`, and the reader P0 checklist in `docs/WORKPLAN.md` before material changes.

Primary implementation areas include:

- `src/features/reader/**`
- `src/hooks/use-auto-scroll.ts`
- `src/app/reader/**`
- `src/lib/storage/reader-storage.ts`
- `src/lib/offline/**`

## Hard regression rules

1. Vertical long-strip/manhwa images must keep usable content width. Never reintroduce the narrow-column regression.
2. Conventional paged manga must remain usable after any long-strip-specific fix.
3. Auto-scroll remains elapsed-time based: `delta = pxPerSec * elapsedMs / 1000`.
4. Background/suspend elapsed time must be capped to prevent large jumps.
5. Manual wheel/touch interaction pauses automation where intended; paused state must not keep scheduling movement unnecessarily.
6. Distant pages use bounded lazy/preload behavior. Do not preload an unbounded chapter.
7. Reserve useful page geometry/aspect ratio before load where implemented to reduce layout shift.
8. Progress/history belongs to the authenticated account and account-bound local cache.
9. Offline progress/history uses the existing IndexedDB outbox/reconnect path; never flush one account's queue under another account.
10. Source/image failure remains explicit with retry/recovery; never substitute demo/mock pages in production.
11. `prefers-reduced-motion` is a required behavior, not optional polish.

## Required proof matrix

For every material reader change verify:

### Conventional manga

- first page;
- middle of chapter;
- last page/completion;
- reload/position restore;
- next/previous chapter behavior where available.

### Long-strip/manhwa

- usable image width;
- no narrow-column collapse;
- stable scroll through long pages;
- no large layout jumps;
- progress remains coherent.

### Auto-scroll

- play;
- pause;
- speed/multiplier;
- manual interruption;
- background/suspend recovery;
- reduced-motion behavior.

### Persistence/offline

- local progress write;
- local history write;
- outbox queue creation;
- successful online flush clears queue;
- offline failure leaves queue pending;
- reconnect/boot retry;
- account switch with pending state;
- reload restores expected progress.

### Controls/accessibility

- touch;
- keyboard;
- visible focus where controls can focus;
- accessible labels for icon-only controls;
- chrome hide/show does not trap focus;
- standalone/fullscreen viewport behavior if touched.

## Read-state and bulk operations

When changing manga-detail or reader read-state behavior:

- keep per-chapter state consistent with saved progress;
- verify bulk mark read/unread on a multi-page chapter list;
- verify cancellation/progress feedback for long bulk operations;
- verify library summary fields do not become obviously inconsistent;
- do not fabricate chapter IDs/links for metadata-only provider results.

## Performance constraints

- Preload only a bounded near-future set.
- Avoid per-frame React state churn for scroll physics.
- Avoid rebuilding large page arrays unnecessarily.
- Do not trade correctness for aggressive caching of authenticated HTML/data.

## Validation

Run focused reader tests while iterating, then:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

A reader layout/progress regression is a merge blocker even if static checks are green.

Update `docs/architecture.md` and `docs/WORKPLAN.md` when reader persistence/offline/conflict semantics materially change.