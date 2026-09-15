---
name: pachimanga-ui
description: Strict PWA/frontend implementation skill for Pachimanga. Use for UI polish, responsive layout, accessibility, PWA install/offline UX, Next.js App Router components, navigation, forms, cards, manga detail, or frontend interactions. Requires docs/art-direction.md, mobile/tablet/desktop/standalone verification, mandatory-auth/privacy preservation, explicit loading/empty/error states, no collateral redesign, and a green web quality gate before completion.
---

# Pachimanga PWA/UI

Optimize the production PWA first. `AGENTS.md` remains mandatory and `docs/art-direction.md` is the visual contract.

## Before editing

1. Read the route, its feature component, shared shell/primitives, and relevant CSS before changing styles.
2. Identify whether the issue is local or caused by a shared component/token.
3. Load `pachimanga-design` rules for any meaningful visual-system change.
4. For reader surfaces, use `pachimanga-reader` instead of treating Reader as ordinary page layout.

## Hard invariants

- Signed-out users stay in the auth experience.
- No guest/demo/mock production preview is introduced.
- Server-only relay credentials stay server-only.
- UI changes must not weaken private/no-store behavior or account-bound local state.
- Native packaging is out of scope during the PWA phase.
- Do not fork the entire UI for “PWA mode” when CSS/layout can support browser + standalone consistently.

## Responsive review matrix

Material UI changes require review at:

- 360px phone;
- ~390–430px phone;
- ~768px tablet;
- ~1280px desktop;
- standalone PWA when navigation/safe-area/install/offline/viewport behavior is involved.

Do not accept horizontal overflow, clipped primary actions, unreachable navigation, or touch controls that require precision.

## Accessibility requirements

- semantic button/link/form controls;
- explicit labels for icon-only controls;
- visible keyboard focus;
- logical focus order;
- touch targets roughly >= 40px;
- sufficient functional-text contrast;
- meaningful loading/empty/error/retry states;
- `aria-live` only where dynamic feedback benefits from announcement;
- `prefers-reduced-motion` respected.

Do not hide inaccessible controls behind hover-only behavior.

## Next.js boundaries

- Keep server/client boundaries consistent with the existing App Router architecture.
- Avoid adding `"use client"` to a large tree merely for a small interaction.
- Do not move secrets/provider credentials to browser code.
- When changing framework APIs, consult the installed Next.js 16 docs under `node_modules/next/dist/docs/` when available.

## Design cleanup rules

- Reuse existing surfaces, radii, button styles, spacing, and typography before adding variants.
- Prefer a shared fix only when the same inconsistency genuinely repeats.
- Keep Pachi/brand decoration away from active reading content.
- Avoid global redesign as collateral work.
- Use concise, accurate copy; do not promise offline/provider behavior the app does not support.
- Real source errors stay explicit and actionable.

## Route-specific minimum checks

### Auth

Forms remain usable with mobile keyboard, validation is clear, and registration/reset actions are discoverable.

### Library/Browse

Search/filter/card actions work by keyboard/touch; empty/loading/error/no-result states are distinct.

### Manga detail

Cover/meta/actions remain readable; chapter pagination and read controls are accessible; large chapter counts do not break layout.

### Import

File/OCR/parsing/matching progress and failures are visible; imported state remains account-owned.

### History/Settings

Empty/resume/account/dangerous actions are explicit; no cross-account stale UI.

### Install/offline

Instructions match actual platform behavior; standalone safe areas work; offline copy does not imply unsupported full offline mode.

## Validation

For implementation changes run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Then re-review the final diff for one-off visual drift and unrelated redesign.

Do not claim visual completion without checking the relevant viewport matrix.