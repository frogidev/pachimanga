---
name: pachimanga-review
description: Quality review for Pachimanga changes. Use for pre-merge review, UX consistency checks, release readiness, and P0 verification from docs/WORKPLAN.md. Catches regressions before they reach production.
---

# Pachimanga Review

## Quality gate (repo root, web changes)

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Native-impacting changes also need
`cargo check --manifest-path src-tauri/Cargo.toml` and
`node scripts/check-native-version.mjs`.
Never hide a failing check; document pre-existing unrelated failures precisely.

## Route checklist

Auth, library, browse, manga detail, reader, import, history, settings,
offline fallback, empty/loading/error states. Every route: mobile 360px,
tablet, desktop, installed-PWA standalone.

## Product invariants (P0, from docs/WORKPLAN.md)

- Mandatory auth: anonymous requests to `/`, `/browse`, `/import`, `/library`,
  and protected APIs expose no app content. Only auth flows and `/offline` public.
- Strict per-user isolation: library, progress, history, settings, imports.
  Logout/account switch leaks no local state. RLS intact.
- No guest/demo/mock fallback in production user paths.
- Manga/source errors explicit with retry.
- WeebCentral relay stays operation-limited; never an arbitrary proxy.

## UX consistency

- Design source: `.hermes/skills/pachimanga-design/SKILL.md` + `pachimanga_design.jpeg`.
- Shared primitives over one-off styles; no duplicated surfaces/radii/gaps.
- Touch targets >= 40px, visible focus, keyboard operable, labeled controls,
  `prefers-reduced-motion` respected.
- No console errors, no broken routes, progress survives reload.

## Severity

P0 blocks merge (auth bypass, data leak, broken reader/library, failing gate).
P1 fixed before production-ready claim (a11y gaps, responsive breaks, copy drift).
P2 tracked follow-up polish.
