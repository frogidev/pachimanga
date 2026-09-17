# New Chat Handoff Prompt

Paste the prompt below into a new ChatGPT chat when resuming Pachimanga work.

```text
Continue development of the GitHub repository `frogidev/pachimanga`.

Work autonomously and proceed with everything you safely can without asking me for input. Keep the PWA/web target first. Do not begin native/platform release work until the PWA release-candidate gate is complete. Use small focused branches/PRs. Never weaken authentication, Supabase RLS, account isolation, secret handling, provider/relay restrictions, or PWA cache boundaries to make a task pass.

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
- current GitHub branch/ruleset behavior;
- latest Vercel production deployment plus build/runtime errors;
- Supabase health/migrations/RLS/advisors for auth/data work;
- WeebCentral relay state for provider/relay work.

Current handoff state (2026-09-17):

- observed `main`: `ef67bc255134ec9bf033846bb8d062131195c715`;
- latest production runtime deployment: `dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN`, `READY`, for runtime commit `605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6`;
- `main` is newer only because PR #52 is tests/ops/docs and intentionally does not require a hosted-runtime deployment;
- GitHub Actions capacity is unavailable for the rest of the current month. Do not rely on Actions and do not weaken branch/security controls as a workaround;
- user-operated local validation on current `main` passed: `npm ci` with 0 vulnerabilities; `npm run verify` with 94/94 tests, lint, typecheck, and Next.js production build all green;
- user-operated production smoke passed: 9 protected routes and 4 PWA icons;
- recent Vercel production error/fatal inspection was clean;
- Supabase project is `gwpgaojsemcfikgynxwv`; RLS/least-privilege/canonical migrations/newer-only conflict guards/account-bound progress summary RPC are already in place;
- progress/settings outboxes are owner-bound;
- library personal status is separate from provider publication status;
- logout/login large-progress rehydration regression is fixed;
- compact library progress summaries, visible sync state, Continue Reading, unread chapter updates, and real Recently Updated are merged;
- explicit PWA update lifecycle, installed-mode handling, bounded runtime cache, account-bound offline chapter downloads, reader navigation/progress controls, Screen Wake Lock, and long-strip containment are merged;
- MangaDex live reader chain has evidence; WeebCentral public relay health has evidence; ComicK metadata works but public chapter-list access has returned `403`, so ComicK must not be treated as a validated reader fallback;
- no production mock fallback is allowed.

Your first autonomous workstream is the pre-human-testing hardening in `docs/WORKPLAN.md`:

1. Settings diagnostics panel with safe Copy diagnostics;
2. explicit Sync now / retry pending sync;
3. clearer offline/network/403/429/relay/provider error UX with safe Retry;
4. Export my data JSON for the signed-in account, excluding secrets/session tokens;
5. final accessibility/focus/keyboard/loading-empty-error responsive pass;
6. per-title manual chapter refresh + useful last-checked indication.

These items were discussed but are NOT yet implemented at this handoff. Do not claim otherwise.

Validation this month:

- run local `npm ci` + `npm run verify` from an environment with the repository/dependencies;
- use Vercel preview/build as the hosted-runtime build signal;
- after runtime merges, confirm the exact production deployment reaches READY;
- run `node ops/production-smoke.mjs` against production;
- inspect Vercel production `error`/`fatal` logs;
- `ops/browser-e2e.mjs` is optional evidence only and should run only where Playwright + Chromium are already available; do not add Playwright to normal project dependencies solely for this.

Do not fabricate the remaining manual evidence. These still require real identities/devices:

- fresh registration/confirmation/password recovery;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device sync and clock-skew observation;
- installed PWA tests on iPhone/iPad/Android/desktop;
- physical reader matrix for conventional and long-strip content;
- representative OCR/.tachibk/.proto.gz/.tmb imports with safe disposable samples.

After pre-human-testing hardening is complete, freeze unrelated feature expansion, update all affected documentation with exact commit/deployment/check evidence, and move to the manual release-candidate matrix.
```
