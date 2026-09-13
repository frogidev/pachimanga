# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a local-first manga reader with private account sync and migration tools for existing libraries.

## Features

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

## Brand

Pachimanga uses a dark plum + coral-pink visual system with Pachi, a playful cat mascot for onboarding, empty states, and install surfaces.
