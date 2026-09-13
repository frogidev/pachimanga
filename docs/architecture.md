# Frogilab Reader architecture

## Runtime boundaries

- `src/app`: Next.js App Router routes and metadata.
- `src/components`: shared navigation and display primitives.
- `src/features`: feature-owned UI and pure reader logic.
- `src/sources/core`: provider contract and registry.
- `src/sources/mock`: deterministic MVP data provider.
- `src/sources/weebcentral`: provider-only URL knowledge and the intentionally disabled adapter.
- `src/lib/storage`: local-first persistence.
- `src/db/schema.sql`: future PostgreSQL/Supabase sync schema; not used by the MVP runtime.

The UI only consumes application models. It does not parse or know provider-specific HTML.

## Reader

Auto-scroll is measured in pixels per second. Each animation frame calculates:

`delta = speedPxPerSecond * elapsedMilliseconds / 1000`

Elapsed time is capped after suspended/backgrounded frames to prevent jumps. No animation frame is scheduled while auto-scroll is paused. Manual wheel and touch-drag input pauses playback.

Pages reserve their aspect ratio before the image loads. Native lazy loading handles distant pages and the reader preloads only the next two image URLs.

## Local-first storage

IndexedDB stores library entries, reading progress, and history. A localStorage fallback is used when IndexedDB is unavailable. Small reader preferences use localStorage directly.

## WeebCentral status

Publicly observable routes currently indicate separate search, series, full chapter list, chapter, and long-strip image endpoints. They are not treated as an official API. The production adapter stays disabled until robots/terms/rate-limit behavior and response stability are verified. The URL-building knowledge is isolated in `src/sources/weebcentral/endpoints.ts` so replacing parsing logic does not touch React features.

No CAPTCHA, authentication, anti-bot mechanism, or access control is bypassed.

## Deployment

The application is designed for Vercel Hobby with Cloudflare retaining DNS for `frogilab.dev`. The first target hostname is `reader.frogilab.dev`. No cloud database is needed until cross-device synchronization is implemented.
