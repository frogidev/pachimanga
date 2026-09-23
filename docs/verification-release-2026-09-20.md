# Pachimanga production verification — 2026-09-20

This is the current production checkpoint after PR #85. Older dated verification files remain historical evidence and are not rewritten.

## Repository state

- release line: PWA/web v1.0.2
- merged PR: #85, `feat: expand PWA reader and library parity`
- production runtime commit: `c48a057b30861b93124020822561eea7f7a9f8f4`
- PR #85 merged on 2026-09-20
- PR #85 final head: `1389bd7cff5ec4b3229875da1ca8fc0c627c8a5a`
- after merge, no product PR remained open and `main` was the only long-lived branch

## Validation evidence

Observed on the final PR #85 head:

- Repository Hygiene — success
- Web Quality — success, including tests, lint, application/test TypeScript checks, and production build
- Native Quality — success, including JavaScript checks, Rust shell compatibility, and version consistency
- Vercel preview — success / READY

The repository owner also reported that the requested local validation completed successfully before merge.

## Production deployment

Vercel production after merge:

- deployment: `dpl_2MvvLYSXBf3u9hjdAULZfXDSFBb2`
- target: production
- state: `READY`
- Git commit: `c48a057b30861b93124020822561eea7f7a9f8f4`
- branch: `main`

The inspected production `error`/`fatal` runtime-log window after merge contained no matching entries.

The repository owner reported that `node ops/production-smoke.mjs` passed against `https://pachimanga.frogilab.dev` after the production deployment became ready.

## Supabase production state

Production project: `gwpgaojsemcfikgynxwv`.

The production migration history includes:

- `20260919234900_tracker_links.sql`
- `20260919235000_source_migration_rpc.sql`

Observed advisor state after those migrations:

- performance advisor: no findings
- security advisor: the existing leaked-password-protection warning remains

The new `tracker_links` table is owner-RLS protected. The source-migration RPC is authenticated, `SECURITY INVOKER`, and fails closed when reading progress/history cannot be mapped safely.

## Production behavior added by PR #85

The current v1.0.2 production line now includes:

- explicit source migration / duplicate consolidation preserving compatible progress, history, collections, and tracker links;
- account-scoped Library, Browse, and manga-detail navigation state/scroll restoration;
- per-title manga/webtoon reader presets and configurable preload depth;
- account-bound offline chapter manifest and Settings management for retry/remove;
- bounded per-user/provider source concurrency;
- optional AniList and MyAnimeList tracking with OAuth tokens kept device-local and excluded from Supabase/export;
- account backup format v2 with v1 import compatibility;
- restoration of reader presets and non-secret tracker links;
- corrected sync completion accounting for library mutations;
- form-action CSP restriction plus HSTS;
- TypeScript checking for test sources;
- caught-up manga behavior that waits for new unread chapters instead of restarting at chapter 1;
- completed chapters remain completed when reopened for rereading;
- completed chapters reopen from the top for intentional rereads;
- completing the latest available unread chapter persists 100% and returns to manga detail.

## Remaining evidence limits

Still useful as post-release evidence:

- fresh registration/email-confirmation/password-recovery matrix;
- Account A -> B -> A browser isolation matrix;
- same-account two-session/two-device sync and clock-skew matrix;
- full signed-in production-data matrix;
- installed-PWA matrix on iPhone/iPad/Android/desktop;
- service-worker upgrade from an older installed build;
- conventional and long-strip physical-device reader matrix;
- representative OCR/`.tachibk`/`.proto.gz`/`.tmb` import matrix;
- authenticated WeebCentral upstream-health verification when operator credentials are available.

Use current `main` plus this document as the production baseline, and re-check live GitHub/Vercel/Supabase state before making time-sensitive claims.
