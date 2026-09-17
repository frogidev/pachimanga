# PR #60 verification — 2026-09-17

PR #60, `feat: finish PWA accessibility and UI-state hardening`, merged to `main` as:

```text
2858d5f1f09e4800fa7fdb97464cf56558f2f27a
```

## Implemented

- consistent global `:focus-visible` treatment for keyboard-accessible controls;
- disabled-control cursor feedback;
- 320px page-padding guard while retaining the existing 360/390/tablet/desktop layout system;
- reduced-motion protection for smooth scrolling and manga-card hover lift;
- Escape dismissal and accessible announcement for the non-modal PWA update notice;
- live-region announcement for PWA installation results;
- optional browser E2E viewport matrix expanded to 320/360/390/768/1280px;
- optional browser assertions for horizontal overflow, visible keyboard focus, and unlabeled button/link controls.

No auth, RLS, provider, relay, or native/platform release boundary was changed.

## Pull-request validation

PR head:

```text
6298d037a0861b939bb27f805e7a3b9d0283299e
```

Observed validation:

- required `hygiene` workflow run `35241581144`: success;
- required `quality` workflow run `35241581105`: success;
- the quality job explicitly completed dependency install, unit tests, ESLint, TypeScript typecheck, and Next.js production build;
- exact-head Vercel preview `dpl_47krfiikt3s2dSDPiFoK1aTMUvDr`: READY;
- no unresolved PR review threads were present before merge.

The current agent container could not clone the repository because outbound DNS to `github.com` is unavailable, so no additional local `npm ci` / `npm run verify` run is claimed here.

## Production verification

Exact production deployment:

```text
deployment: dpl_CQuCELMmy2dWPbknbGjjy7iJHbQA
commit:     2858d5f1f09e4800fa7fdb97464cf56558f2f27a
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Post-deploy evidence:

- `/auth` returned HTTP 200 through Vercel with the expected `Sign in to Pachimanga` content;
- `/auth` returned `Cache-Control: private, no-store`;
- Vercel production `error`/`fatal` inspection for the new deployment returned no matching logs in the inspected 30-minute window.

The required production smoke script was executed from the current agent container using the repository script contents, but Node fetch failed before route assertions because the container cannot resolve/reach the production host. This is **not** a passing production smoke and must not be represented as one.

## Live platform state checked during this work

GitHub:

- `main` advanced from `f844098da739172977cf24cb2fa7246f8811130b` to the PR #60 squash merge above;
- active ruleset `Protect main` requires pull requests, strict up-to-date `hygiene` and `quality` status checks, resolved review threads, and squash merge; there is no bypass actor;
- no open issues were found; PR #60 was the only open PR at the time of merge;
- multiple old feature/docs branches remain on the remote and should be treated as stale cleanup candidates when branch deletion tooling/operator access is available.

Supabase production project `gwpgaojsemcfikgynxwv`:

- migration chain is present through `20260917030319 restrict_library_progress_summary_rpc`;
- RLS is enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`;
- inspected policies remain authenticated-owner scoped with `auth.uid()` predicates;
- performance advisor: no findings;
- security advisor: only the known leaked-password-protection warning remains.

WeebCentral relay:

- direct public `/health` re-check was attempted, but the current container cannot resolve `wc-relay.frogilab.dev`; no fresh relay-health pass is claimed;
- this PR did not change provider/relay behavior.

## Pre-human-testing hardening state

All six planned autonomous hardening items now have merged code and validation evidence:

1. safe Settings diagnostics with Copy diagnostics;
2. explicit `Sync now` and retry-pending-sync controls;
3. differentiated provider error UX with safe Retry;
4. signed-in account JSON export;
5. final accessibility/UI-state hardening;
6. per-title manual chapter refresh with last-checked information.

This closes the autonomous pre-human-testing hardening workstream. Unrelated feature expansion should now remain frozen while the manual PWA release-candidate matrix is executed.

## Evidence still requiring human/device execution

Do not mark these complete without real evidence:

- registration/email confirmation/password recovery;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device synchronization;
- near-simultaneous/clock-skew behavior;
- installed PWA on iPhone, iPad, Android, and desktop Chromium;
- service-worker update from an older installed version;
- physical-device conventional and long-strip reader validation;
- representative OCR, `.tachibk`, `.proto.gz`, and `.tmb` imports with safe disposable samples;
- a fresh credential-free production smoke from a network-capable environment.
