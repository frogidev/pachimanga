# New Chat Handoff Prompt

Paste the prompt below into a new ChatGPT chat when resuming Pachimanga work.

```text
You are continuing development of the GitHub repository `frogidev/pachimanga`.

Work autonomously and proceed with everything you safely can without asking me for input. Keep the PWA/web target first. Do not prioritize native/platform deployment until the PWA release-candidate gate is complete. Use small focused branches/PRs, keep `main` protected, and never weaken auth/RLS/account isolation/secret boundaries just to make tests pass.

Start by reading, in order:
1. `AGENTS.md`
2. `docs/WORKPLAN.md`
3. `docs/verification-2026-09-16.md`
4. `docs/architecture.md`
5. `docs/operations.md`
6. `docs/vercel-build-policy.md`
7. `supabase/README.md`
8. the most specific `.hermes/skills/**/SKILL.md` for the task

Then verify live state before editing:
- current `main` HEAD;
- open PRs and issues;
- active GitHub ruleset/required checks;
- latest Vercel production deployment and build/runtime errors;
- Supabase project health/advisors if auth/data work is implicated;
- current relay state if WeebCentral is implicated.

Known status at the 2026-09-16 handoff:
- `main` was `2f9f37c4647c8312e114962b4918e4181f8b99ac`;
- no open PRs/issues were present;
- `Protect main` requires PRs, up-to-date branches, resolved review threads, squash merges, and required checks `hygiene` + `quality`, with force-push/deletion blocked and no bypass actors;
- Supabase project `gwpgaojsemcfikgynxwv` was `ACTIVE_HEALTHY`, RLS/least-privilege grants were clean, performance advisor had no lints, and leaked-password protection was the only accepted plan-limited security warning;
- canonical Supabase migrations and stale-write guards are already in place;
- progress and reader settings use owner-bound outboxes;
- provider/import/reader hardening through PR #42 is merged;
- the Portainer `pachimanga-relay` stack was redeployed and the relay container was observed healthy;
- the highest-priority technical blocker is Vercel deployment drift.

Vercel state at handoff:
- production deployment `dpl_xpxK7S5rG1EVmAoT1jBw6cgVutPv` was `READY` for commit `626dbb5aea35ea186107fdb923737ed1ef9dfde8`;
- production was three commits behind `main`;
- live auth UI returned HTTP 200 with `Cache-Control: private, no-store` and no recent runtime errors were found;
- a recent preview failed before build with `fatal: bad revision ''`;
- current `vercel.json` diffs `$VERCEL_GIT_PREVIOUS_SHA` against `$VERCEL_GIT_COMMIT_SHA` without guarding an empty/unusable previous SHA.

Your first task is to verify that this is still current, then fix the Vercel ignored-build behavior so missing/unresolvable comparison SHAs fail open to CONTINUE THE BUILD, while valid comparable commits still skip non-runtime-only deployments. Add regression coverage where practical, run the full required web quality gate, open a focused PR, merge only when `hygiene` and `quality` pass, confirm a new production deployment reaches READY, run Production Smoke, and inspect post-deploy runtime errors.

After the deployment gap is resolved, continue autonomously through the remaining non-manual work in `docs/WORKPLAN.md`: live provider smoke, reader/import release evidence, browser E2E automation, performance/observability/cleanup, and documentation reconciliation.

Do not fabricate completion of manual evidence. The remaining tasks that genuinely need me are real-account registration/confirmation/password-recovery, same-browser Account A/B isolation, two-device/session sync validation, and installed-PWA testing on iOS/iPadOS/Android/desktop.

When you finish a substantive workstream, update the project documentation with exact commit/deployment/check evidence and continue to the next safe task without waiting for me unless an operation is destructive, requires a secret/real identity/device, changes production data intentionally, or triggers native/platform release.
```
