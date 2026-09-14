---
name: pachimanga-design
description: Visual art direction for Pachimanga. Use when building or polishing any user-facing surface so it matches the cozy pixel-art library design (dark plum + pink, pixel headings, Pachi cat mascot).
---

# Pachimanga Design Direction

Source of truth: `pachimanga_design.jpeg` (repo root parent: `F:/LF/pachimanga_design.jpeg`).
Do not copy copyrighted manga characters or franchise artwork. Covers stay original/mock.

## Palette

- App bg near-black plum: `#09080d`; sidebar `#0b0910`
- Surfaces: `#12111a` raised `#171621` soft `#1b1a26`; borders white ~8%
- Primary pink: `#ff78b4` / soft `#ff9cca`; active pills pink bg with dark ink text `#28101b`
- Progress bars: sky blue (`sky-400 → sky-300`); status text `sky-300`
- Body text `#f5f2f7`, secondary `zinc-400`, muted `zinc-500/600`

## Typography

- Display headings: `.pixel-heading` (mono 900, tight tracking, pink glow shadow)
- Kickers/labels: `.pixel-kicker` (mono 700, uppercase, wide tracking)
- Body/UI: Inter system stack; card titles 13–14px semibold; meta 10–11px

## Signature elements

- Left sidebar 252px: logo top, pink gradient active pill, pink dot on Updates,
  pixel speech bubble ("Good manga / better days. ♡") over sleeping Pachi cat,
  version card bottom. Mobile: top bar + 5-item bottom tab bar, safe-area aware.
- `PixelRoomBanner`: night pixel-art bedroom hero, speech bubble
  ("Read more ♡ be happier!"), cat on sill. Full-bleed above library header.
- Library header: "Welcome to **Pachimanga**" (Pachimanga in pink) +
  "Organize. Read. Sync. Your manga. Everywhere."
- Search: dark field, icon left, `Ctrl K` kbd hint right, focuses on Ctrl/Cmd+K.
- Status pills fully rounded: All / Reading / Completed / On Hold / Dropped / Plan to Read.
- Manga cards: 2:3 cover, ⋮ menu top-right, status badge bottom-left over cover,
  title, `Ch. N/?` line, blue progress bar + % right.
- Dashed pink promo strip: "A new chapter is always a good idea. /
  Keep reading, keep collecting, keep enjoying!" + pink "Browse Manga →" button.
- Footer: "Made with ♡ for manga lovers." + cat silhouette.

## Rules

- Content-first, calm reader surfaces; no gradients except pink CTA/active states.
- No glassmorphism, no decorative animation near reading content.
- Touch targets ≥ 40px; visible focus rings (`pink-400/70`); `min-h-dvh` + safe areas.
- `prefers-reduced-motion`: disable hover lifts and transitions.
