# New Chat Handoff Prompt

Paste the prompt below into a new ChatGPT chat when resuming Pachimanga work.

```text
Continue development of the GitHub repository `frogidev/pachimanga`.

Work autonomously and proceed with everything you safely can without asking me for input. Keep the PWA/web target first. Do not begin native/platform release work until the PWA release-candidate gate is complete. Never weaken authentication, Supabase RLS, account isolation, secret handling, provider/relay restrictions, or PWA cache boundaries to make a task pass.

Start by reading, in order:

1. `AGENTS.md`
2. `docs/WORKPLAN.md`
3. `docs/verification-2026-09-17.md`
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
- current GitHub ruleset/required-check behavior;
- latest Vercel production deployment and runtime errors;
- Supabase migrations/RLS/advisors for auth/data work;
- WeebCentral relay state for provider/relay work.

Current handoff state (2026-09-17):

- `main`: `c9060fd177b7d3cdf607cbde1945af875e283fa7`;
- production deployment: `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA`, `READY`, for the exact same runtime commit;
- PR #68 merged the consolidated PWA test branch;
- final PR #68 head `0e4fdb5eefd2f870c9e47435ac40ccec9735ff92` passed Repository Hygiene, Web Quality (install, tests, lint, typecheck, production build), and Production Smoke;
- Vercel preview creation was intermittently blocked by the Hobby build-rate limit, but the exact merged production commit deployed successfully;
- the post-deploy production error/fatal log inspection for `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` returned no matching entries in the inspected window;
- account management now lives inside Settings; `/account` remains a protected compatibility redirect to `/settings#account`;
- profile personalization, confirmation resend, password recovery, signed-in password change, and safe sign-out are implemented;
- sign-out is the final Settings action; theme selection is a quick app-shell toggle rather than a Settings card;
- sync-status observation is shared/visibility-aware and queue counts use IndexedDB `count()`;
- provider refreshes are bounded/coalesced and have a hard timeout;
- WeebCentral chapter parsing avoids the Next.js >2 MB raw-response cache failure by using bounded parsed-result caching;
- a new reader starts at the earliest available chapter; `Continue` appears only when real progress exists;
- Updates/Library/Browse/History use real loading/error/confirmed-zero states instead of decorative placeholders;
- MangaDex has a verified reader chain; WeebCentral public relay health has prior evidence; ComicK metadata works but its public chapter-list path has returned `403`, so do not treat ComicK as a validated new-reader fallback;
- no production mock fallback is allowed.

The autonomous code-hardening phase is complete enough to focus on release-candidate evidence. Freeze unrelated feature expansion unless manual testing finds a concrete defect.

Do not fabricate the remaining manual evidence:

- fresh registration/email confirmation, confirmation resend and rate-limit behavior;
- password recovery/new-password login and fresh login after signed-in password change;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device progress/history/settings synchronization;
- near-simultaneous/clock-skew sync behavior;
- installed PWA on iPhone/iPad/Android/desktop;
- service-worker update from an older installed version;
- physical-device conventional and long-strip reader validation;
- representative OCR/.tachibk/.proto.gz/.tmb imports using safe disposable samples;
- fresh credential-free `node ops/production-smoke.mjs` against the current production runtime from a network-capable environment if not already re-run after the latest merge.

For any new runtime-impacting PR:
- run `npm ci` / `npm run verify` where available;
- require Repository Hygiene + Web Quality;
- use Vercel preview/build when available;
- merge only when repository rules permit;
- confirm the exact production deployment reaches READY;
- run Production Smoke;
- inspect production error/fatal logs;
- update current-state documentation with exact evidence.

Do not start native/platform distribution until the PWA release-candidate gate is complete.
```
