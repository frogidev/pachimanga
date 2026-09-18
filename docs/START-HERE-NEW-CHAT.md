# New Chat Handoff Prompt

Paste the prompt below into a new ChatGPT chat when resuming Pachimanga work.

```text
Continue development of the GitHub repository `frogidev/pachimanga`.

Pachimanga PWA/web v0.4.0 is released. The new phase is post-release improvement driven by real user feedback.

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

GitHub Actions capacity is unavailable through September 30, 2026 and is expected to return October 1. Until then:
- do not waste pushes trying to obtain unavailable Actions checks;
- do not treat missing/skipped Actions as passing;
- do not weaken rulesets/security/quality gates;
- batch changes before pushing;
- minimize Vercel builds;
- use trustworthy local verification plus one exact-head Vercel build for runtime work when practical;
- re-check actual Actions availability on or after October 1 before assuming CI is back.

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
3. `docs/verification-release-2026-09-18.md`
4. `docs/post-release-feedback.md`
5. `docs/architecture.md`
6. `docs/operations.md`
7. `docs/vercel-build-policy.md`
8. `docs/library-state.md`
9. `docs/reader-pwa-hardening.md`
10. `docs/browser-e2e-performance.md`
11. `supabase/README.md`
12. the most specific `.hermes/skills/**/SKILL.md` for the task

Then verify live state before editing:
- current `main` HEAD;
- open PRs/issues and active/stale work branches;
- current ruleset/check behavior;
- latest Vercel production deployment and runtime errors for runtime work;
- Supabase migrations/RLS/advisors for auth/data work;
- relay health for provider/relay work.

Current release baseline:
- release: v0.4.0 PWA/web;
- hosted runtime: `9e0cc7c379541db0d640ebe03383466c37d933ba`;
- production deployment: `dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5`, READY;
- current `main` may be a docs-only runtime-equivalent descendant;
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
