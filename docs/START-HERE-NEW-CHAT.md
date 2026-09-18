# New Chat Handoff Prompt

Paste the prompt below into a new ChatGPT chat when resuming Pachimanga work.

```text
Continue development of the GitHub repository `frogidev/pachimanga`.

Pachimanga PWA/web v0.4.0 is released. Keep post-release work PWA/web first unless I explicitly request native/platform distribution. Do not weaken authentication, Supabase RLS, account isolation, secret handling, provider/relay restrictions, or PWA cache boundaries.

Start by reading, in order:

1. `AGENTS.md`
2. `docs/WORKPLAN.md`
3. `docs/verification-release-2026-09-18.md`
4. `docs/architecture.md`
5. `docs/operations.md`
6. `docs/vercel-build-policy.md`
7. `docs/library-state.md`
8. `docs/reader-pwa-hardening.md`
9. `docs/browser-e2e-performance.md`
10. `supabase/README.md`
11. the most specific `.hermes/skills/**/SKILL.md` for the task

Then verify live state before editing:

- current `main` HEAD;
- open PRs/issues and stale work branches;
- current ruleset/required-check behavior;
- latest Vercel production deployment and runtime errors;
- Supabase migrations/RLS/advisors for auth/data work;
- WeebCentral relay state for provider/relay work.

Release handoff state (2026-09-18):

- release: v0.4.0 PWA/web;
- release runtime/main at designation: `9e0cc7c379541db0d640ebe03383466c37d933ba`;
- production deployment: `dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5`, `READY`, exact same runtime commit;
- final PR #74 exact-head preview: `dpl_46qhkopEh5HNFUyxNgBzA6P6djeZ`, `READY`;
- operator reported the final local unit tests, lint, typecheck, and production build all passed before merge;
- Vercel production build compiled successfully and produced 22/22 static pages;
- post-deploy Vercel error/fatal inspection returned no matching entries in the inspected window;
- GitHub Actions capacity is unavailable for the remainder of September 2026; do not treat absent Actions as passing evidence and do not weaken repository protections;
- Supabase migration `20260918010000_pwa_collections_profile_and_clear_rpc.sql` is applied in production;
- account-owned collections, profile avatar URL, transactional clear-library RPC, library outbox, logical clock hardening, export/import round-trip, richer reading stats, quota-aware/cancellable offline chapter saving, Web Vitals telemetry, and chapter publication dates are merged;
- light mode uses the warm-paper visual contract and the auth page no longer mixes a dark hero with light-theme text;
- display name/avatar now appear as normal account identity in desktop/mobile shell surfaces and link to Settings > Account;
- MangaDex remains a validated reader source; ComicK chapter-list 403 remains explicit; WeebCentral relay/provider restrictions remain unchanged;
- no production mock fallback is allowed.

The owner explicitly designated v0.4.0 as released. Do not rewrite unchecked real-device/account/import evidence as completed. Treat these as post-release validation/regression backlog:

- fresh auth/email/recovery lifecycle;
- Account A -> B -> A browser isolation;
- two-device synchronization and near-simultaneous/clock-skew behavior;
- installed PWA on iPhone/iPad/Android/desktop;
- older-service-worker upgrade behavior;
- physical-device conventional and long-strip reader checks;
- representative OCR/.tachibk/.proto.gz/.tmb imports;
- fresh exact-runtime credential-free production smoke when a network-capable environment is available.

For any runtime-impacting change:
- run `npm ci` and `npm run verify` where available;
- use one exact-head Vercel preview/build when practical;
- merge only when repository rules permit;
- confirm exact production `READY`;
- run Production Smoke when network access permits;
- inspect production error/fatal logs;
- update current-state documentation.

Native workflows remain manual-only. Do not start native signing/store/installer/TestFlight work unless I explicitly request the native distribution phase.
```
