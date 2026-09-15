---
name: pachimanga-design
description: Canonical visual-system guardrail for Pachimanga. Use for visual design, art direction, shared styling, mascot/assets, cards, navigation, auth/install/empty states, or design-system cleanup. Follow docs/art-direction.md and existing shared components; reduce visual drift, preserve reader focus/accessibility, use only original/licensed assets, and never depend on untracked developer-local concept files as the source of truth.
---

# Pachimanga design direction

Primary source of truth: `docs/art-direction.md` plus the existing shared components and `src/app/globals.css`.

A developer-local concept image may be useful inspiration when available, but design correctness must not depend on a file outside the repository.

## Intent

Pachimanga is a quiet late-night manga room: dark plum, warm pink/orange, original pixel-cat personality, and calm content-first surfaces.

The reader is the priority. Decoration recedes around manga pages.

## Core tokens

- Background: `#09080d`
- Deep/sidebar background: `#0b0910`
- Surfaces: approximately `#12111a`, `#171621`, `#1b1a26`
- Primary pink: `#ff78b4`
- Soft pink: `#ff9cca`
- Warm orange: `#e8933c`
- Cream: approximately `#fff1e0` / `#fff7ed`
- Primary text: approximately `#f5f2f7`
- Muted text: zinc 400/500/600
- Reading progress: sky 400 -> sky 300
- Read/success state: emerald 300/400
- Borders: low-contrast white around 7–10%

Do not introduce an unrelated second accent system.

## Typography

- Use existing `.pixel-heading` for intentional display moments.
- Use `.pixel-kicker` for compact uppercase section labels.
- Keep body/UI typography on the existing sans system.
- Keep important metadata readable; do not push functional text into ultra-low contrast.

## Signature patterns

Preserve the established family resemblance across:

- desktop sidebar and active pink state;
- mobile top/bottom navigation with safe areas;
- Pachi mascot/brand moments in auth/install/empty/onboarding areas;
- 2:3 manga covers and consistent card metadata/progress hierarchy;
- quiet manga-detail chapter lists;
- minimal reader chrome.

## Hard rules

1. No copyrighted manga/anime/franchise characters as product decoration.
2. Pachi must remain original.
3. No glassmorphism as a new global language.
4. Do not add gradients to every surface; reserve them for intentional CTA/progress/brand moments.
5. No decorative animation that competes with reading/navigation.
6. Touch targets should be >= ~40px for primary controls.
7. Visible keyboard focus is required.
8. `prefers-reduced-motion` must be respected.
9. Do not add a new one-off radius/color/button/surface if an existing shared pattern can express the need.
10. Do not redesign unrelated screens during a focused task.

## Responsive proof

For material visual changes, verify at minimum:

- 360px phone;
- ~390–430px phone;
- ~768px tablet;
- ~1280px desktop;
- installed PWA/standalone if navigation, safe areas, install/offline, or viewport behavior changed.

Reader visual changes also require conventional-page and long-strip/manhwa content.

## Design cleanup method

1. Read `docs/art-direction.md`.
2. Inspect the current route and shared components first.
3. Identify drift/duplication before creating new styles.
4. Prefer shared primitive/token cleanup over route-specific patches when the same pattern repeats.
5. Keep the change narrowly scoped; do not use “design polish” as permission for a full redesign.
6. Verify focus/touch/reduced-motion/responsive behavior.
7. Run the web quality gate for implementation changes.
8. Update `docs/art-direction.md` when a shared visual contract intentionally changes.

A successful design cleanup leaves fewer competing patterns than it started with.