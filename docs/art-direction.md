# Pachimanga art direction

This is the canonical visual contract for production UI. Existing shared components and `src/app/globals.css` should implement this system. External concept images may inspire work but are not required source files and must not be treated as the only source of truth.

## Design intent

Pachimanga should feel like a quiet late-night manga room: warm, private, focused, slightly playful, and recognizably pixel-inspired without turning every surface into pixel art.

The reader is the most important surface. Decoration must recede around reading content.

## Core palette

Foundation:

- App background: near-black plum `#09080d`
- Sidebar/deep background: `#0b0910`
- Main surfaces: approximately `#12111a`, `#171621`, `#1b1a26`
- Light text: `#f5f2f7`
- Secondary text: zinc 400 range
- Muted text: zinc 500/600 range
- Low-contrast borders: white around 7–10% opacity

Brand accents:

- Primary pink: `#ff78b4`
- Soft pink: `#ff9cca`
- Warm orange/cat: `#e8933c`
- Cream: around `#fff1e0` / `#fff7ed`
- Dark ink/brown: approximately `#241a12` / `#28101b`
- Reading/progress blue: Tailwind `sky-400` to `sky-300`
- Success/read state: emerald 300/400 range

Avoid introducing a second unrelated accent system.

### Light theme

Light mode is a warm paper counterpart to the late-night dark theme, not an inversion.

- App background: warm paper around `#f6f1e8`.
- Primary surfaces/sidebar: off-white around `#fffdfa` / `#ffffff`.
- Secondary surface: warm stone around `#f2ebe2`.
- Primary text: warm ink around `#211c18`.
- Secondary text: warm gray/brown around `#5d544c`.
- Muted functional text should remain readable around `#74695f`; reserve lighter tones for non-essential metadata.
- Borders use warm brown/ink at roughly 12–18% opacity instead of white transparency.
- Dark-mode utility surfaces (search, filters, cards, collection panels, selects) must resolve to intentional light surfaces rather than remaining near-black.
- Orange remains the active/brand accent. Blue remains reserved for reading progress/collection selection and should use a darker readable foreground on light surfaces.
- Media overlays may remain dark when they sit directly on manga cover art; do not globally recolor those overlays into light cards.
- Light-mode focus rings, hover states, disabled states, and input placeholders must remain visually distinct.

The same hierarchy must hold in both themes: changing theme must not make an enabled control look disabled or reduce functional-text contrast.

## Typography

- Display/pixel headings: existing `.pixel-heading` treatment; bold/mono/pixel-adjacent, tight tracking, restrained glow.
- Small section labels/kickers: `.pixel-kicker`; uppercase, wide tracking, compact size.
- Body/UI: existing system/Inter-like sans stack.
- Manga/card titles: compact semibold hierarchy.
- Metadata/status: smaller, muted, readable; do not force important information into ultra-low contrast.

Typography should remain legible at 360px mobile widths and in installed-PWA standalone mode.

## Geometry and surfaces

- Prefer a small consistent radius set; most cards/panels should feel softly rounded rather than bubbly.
- Use subtle borders and depth; avoid heavy shadows around every component.
- Buttons/pills may be fully rounded where the current design uses that language.
- Do not add glassmorphism or translucent blur as a new global visual system.
- Gradients are reserved for intentional brand/CTA/progress moments, not every card.

## Pachi mascot

Pachi is an original pixel cat mascot used for:

- onboarding/authentication warmth;
- empty states;
- install/PWA guidance;
- side navigation/brand moments;
- promotional banners when they do not distract from content.

Rules:

- Keep Pachi original and recognizably consistent.
- Do not copy copyrighted manga/anime characters or franchise designs.
- Do not use mascot art inside the active reading canvas when it competes with pages.

## Signature application patterns

### Desktop navigation

- Left navigation around the existing ~252px visual density.
- Clear active state with pink emphasis.
- Brand/mascot moment is allowed below primary navigation.
- Account settings live in the Settings page; version/sync information stays visually secondary in the sidebar footer.
- A compact theme quick-toggle may sit immediately below Settings in desktop navigation because it is a frequent global preference, not a full settings workflow.
- Do not duplicate Account or Import navigation in the sidebar footer or Settings cards when a primary navigation destination already exists.

### Mobile/PWA navigation

- Compact top/header treatment plus bottom navigation where implemented.
- Respect `env(safe-area-inset-*)` in standalone mode.
- Avoid horizontal overflow at 360px.
- Primary actions must remain reachable without precise taps.

### Library

- Welcome/brand section can use the warm room/mascot visual language.
- Search remains prominent and keyboard friendly.
- Status filters use consistent pills.
- Manga cards keep a 2:3 cover ratio, clear title/status/progress hierarchy, and predictable action placement.
- Empty library state should guide the user toward Browse/Import rather than showing fake manga.

### Browse

- Source/provider state must be clear without overwhelming the result card.
- Loading, upstream refusal, no-result, and retry states must be explicit.
- Search results should visually align with library manga cards where practical.

### Manga detail

- Cover + metadata + primary reading/library actions form the first hierarchy.
- Chapter lists prioritize chapter title/read state over decoration.
- Read/unread/bulk controls require clear affordance and disabled/progress states.

### Reader

- Reading pages dominate the viewport.
- Chrome is quiet and can auto-hide.
- Long-strip/manhwa content keeps useful width.
- No hero art, promotional banners, or unrelated animation around the reading canvas.

### Settings/account

- Settings should be ordered by user importance: account/security first, reading behavior, sync/device/data/diagnostics later, and Sign out last.
- Sign out is a terminal/destructive session action and should not compete visually with profile/password controls.
- Avoid duplicate theme/import/account entry cards when the same action is available more directly in the shell or primary navigation.

### Auth/install/offline

- These are appropriate places for stronger Pachi/brand moments.
- Auth must still look like the same product, not a marketing microsite.
- Offline must explain limitations accurately; never imply account data is available if it was not cached/supported.

## Interaction rules

- Touch targets should be at least ~40px in both dimensions for primary controls.
- Every interactive control has a visible keyboard focus state.
- Icon-only controls require accessible labels/titles where appropriate.
- Hover effects may reinforce interactivity but cannot be the only cue.
- Honor `prefers-reduced-motion`; disable non-essential transforms/transitions and do not force auto-scroll for reduced-motion users.
- Destructive actions need clear wording and confirmation proportional to impact.

## Motion

Allowed:

- short opacity/position transitions;
- small hover emphasis;
- progress feedback;
- reader chrome transitions that do not interfere with content.

Avoid:

- continuous decorative motion;
- parallax around manga pages;
- bounce/pulse on persistent navigation;
- animation that shifts layout while reading.

## Responsive review matrix

Every material UI change should be checked at least at:

- 360px narrow mobile;
- ~390–430px modern phone;
- ~768px tablet;
- ~1280px desktop;
- installed PWA/standalone when the change touches navigation, safe areas, install/offline, or viewport behavior.

Reader work additionally needs conventional-page and long-strip content.

## Asset rules

Preferred production assets are repository-controlled originals under `public/` or generated original components.

Do not:

- hotlink copyrighted promotional art as product decoration;
- commit unlicensed manga/anime character art;
- depend on a developer-local image path for runtime/design correctness;
- replace real manga covers returned by providers with fake production fallback covers unless the provider genuinely supplies no usable cover and the UI explicitly indicates the missing state.

## Design change discipline

Before adding a new one-off radius, surface, button style, spacing scale, or color, verify the existing shared component/token cannot express the need.

A design cleanup should reduce drift, not create a new parallel system. If a shared visual rule changes, update this document and the relevant Hermes design/UI skill in the same change.