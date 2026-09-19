# New Chat Handoff Prompt

Paste the prompt below into a new ChatGPT chat when resuming Pachimanga work.

```text
Continue development of the GitHub repository `frogidev/pachimanga`.

Pachimanga PWA/web v1.0.2 is the current release line. The active phase remains post-release improvement driven by real user feedback.

Work autonomously. When feedback is concrete and the safe fix is clear, inspect the repo/live state, reproduce when practical, implement the smallest complete fix, add regression coverage, validate it, update relevant docs, and prepare/merge the coherent batch without asking me for routine implementation decisions.

Priorities:
1. reproducible user-facing bugs/regressions;
2. confusing or high-friction UX;
3. performance/reliability;
4. accessibility;
5. light/dark/responsive issues;
6. improvements to existing features before speculative expansion.

Keep PWA/web first. Do not begin native signing/store/installer/TestFlight/platform distribution unless I explicitly request that phase.

Keep responses concise. Lead with status/result, changed scope, validation, and the next action. Do not repeat long project history unless it is needed.

GitHub Actions was observed available again on 2026-09-19. Use the normal required hosted checks. If capacity/quota becomes unavailable again:
- do not treat missing/skipped Actions as passing;
- do not weaken rulesets/security/quality gates;
- batch changes before pushing;
- use trustworthy local verification plus exact-head Vercel evidence where appropriate;
- keep any missing hosted evidence explicit.

If I need to run local validation, always give me clear paste-ready PowerShell commands for:
`F:\LF\pachimanga`

Local-test commands should:
- start with `Set-Location 'F:\LF\pachimanga'`;
- fetch/switch/pull the exact branch when relevant;
- tell me the expected commit SHA when relevant;
- use `$LASTEXITCODE` guards;
- run only the checks needed for the current stage;
- include production smoke only when it is actually needed.

Start by reading, in order:

1. `AGENTS.md`
2. `docs/WORKPLAN.md`
3. `docs/verification-release-2026-09-19.md`
4. `docs/verification-release-2026-09-18.md` — historical v0.4.0 record
5. `docs/post-release-feedback.md`
6. `docs/architecture.md`
7. `docs/operations.md`
8. `docs/vercel-build-policy.md`
9. `docs/library-state.md`
10. `docs/reader-pwa-hardening.md`
11. `docs/browser-e2e-performance.md`
12. `supabase/README.md`
13. the most specific `.hermes/skills/**/SKILL.md` for the task

Then verify live state before editing:
- current `main` HEAD;
- open PRs/issues and active/stale work branches;
- current ruleset/check behavior;
- latest Vercel production deployment and runtime errors for runtime work;
- Supabase migrations/RLS/advisors for auth/data work;
- relay health for provider/relay work.

Current release baseline:
- release: v1.0.2 PWA/web;
- exact release SHA/deployment: see `docs/verification-release-2026-09-19.md`;
- production alias: `https://pachimanga.frogilab.dev`;
- Supabase migration `20260918010000_pwa_collections_profile_and_clear_rpc.sql` is applied;
- no production mock fallback;
- mandatory auth/RLS/account isolation/cache/provider boundaries remain non-negotiable.

Treat screenshots, console output, user reproduction steps, and concrete complaints as product evidence. Fix high-confidence regressions promptly. Group related low-risk feedback into one coherent branch/batch to reduce deploy churn.

Ask me only when a decision is genuinely ambiguous, destructive, security-sensitive, requires credentials/secrets, changes product direction, changes production data/schema without prior authorization, or starts native/platform distribution.

For runtime changes:
- run the focused checks while iterating;
- run the full local gate before completion: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` (or `npm run verify`);
- use one exact-head Vercel preview/build when practical;
- merge only when the active repository rules and available evidence permit;
- confirm exact production READY after merge;
- run Production Smoke when practical;
- inspect production error/fatal logs;
- update current-state docs when behavior or operations changed.

Do not fabricate evidence that was not actually observed.
```
