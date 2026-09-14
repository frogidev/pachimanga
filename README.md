# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a local-first manga reader with private account sync and migration tools for existing libraries.

## Features

- Installable PWA for iPhone, iPad, Android and desktop browsers
- Optional private WeebCentral relay for full browser/PWA source access
- Native Tauri shell with an on-device WeebCentral bridge
- Supabase email/password registration and per-user RLS
- Private cloud library and reading progress
- Screenshot/image OCR import with review before matching
- Tachiyomi / Mihon backup import (`.tachibk`, `.proto.gz`)
- Tachimanga backup import (`.tmb`)
- JSON import fallback
- Next.js App Router frontend

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the Supabase values in `.env.local`. Never commit secret/service-role keys.

The WeebCentral relay is optional in local development. When configured, set the server-only `WEEBCENTRAL_RELAY_URL` and `WEEBCENTRAL_RELAY_TOKEN` values described in [`docs/free-pwa-distribution.md`](docs/free-pwa-distribution.md).

## Free distribution

For the zero-cost distribution path, use the PWA on iPhone/iPad and browsers. Android, Windows, Linux and macOS native packages can remain optional. The private relay lets the PWA use WeebCentral without exposing an arbitrary proxy or moving manga image bandwidth through the homelab.

See [`docs/free-pwa-distribution.md`](docs/free-pwa-distribution.md) for the complete homelab, Cloudflare Tunnel, Vercel and iPhone/iPad installation flow.

## Brand

Pachimanga uses a dark plum + coral-pink visual system with Pachi, a playful cat mascot for onboarding, empty states, and install surfaces.
