---
name: pachimanga-ui
description: PWA and frontend design work for Pachimanga. Use for UI polish, responsive layout, accessibility, PWA install experience, reader presentation, Next.js App Router components, styling, or frontend interaction changes in the frogidev/pachimanga project. Keep the current visual language coherent and treat native platform packaging as out of scope unless explicitly requested.
---

# Pachimanga PWA and UI

Optimize the production PWA first. Follow the repository's existing components, typography, spacing, and interaction patterns before inventing new visual systems.

## Procedure

1. Read the relevant route, shared layout, and reusable components before editing.
2. Check both narrow mobile/PWA and desktop behavior for every visual change.
3. Keep signed-out users in the authentication experience; never expose application content as a preview/demo.
4. Preserve usable reader width for long-strip/manhwa content and avoid layout rules that collapse images into narrow columns.
5. Keep interactive controls accessible: semantic elements, labels, keyboard behavior, visible focus, adequate touch targets, and meaningful loading/error states.
6. Avoid unnecessary client components. Keep server/client boundaries consistent with the existing Next.js App Router architecture.
7. Do not weaken private/no-store handling or move server-only relay credentials into browser-visible variables.
8. Prefer CSS/layout fixes over platform-specific forks when the same UI should work in installed PWA and browser modes.
9. Run lint, typecheck, relevant tests, and a production build after significant frontend changes.

## Design cleanup rules

- Remove duplicated UI before adding variants.
- Prefer a small number of consistent surfaces, radii, gaps, and text hierarchies.
- Use concise copy and explicit empty/error states.
- Avoid ornamental animation that interferes with reading or navigation.
- Do not redesign unrelated screens as collateral work.
