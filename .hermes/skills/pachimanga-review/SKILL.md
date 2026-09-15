---
name: pachimanga-review
description: Strict pre-merge/release-readiness review for Pachimanga. Use to audit diffs, PRs, CI failures, production readiness, security regressions, UX consistency, or WORKPLAN P0/P1 gates. Auth bypass, cross-account leakage, secret exposure, conflict markers, broken reader/library flows, widened source/native proxies, accidental native release triggers, or failing required checks are merge blockers. Require evidence, not self-reported success.
---

# Pachimanga review

Review against `AGENTS.md`, `docs/WORKPLAN.md`, and the relevant domain skill. The goal is to catch regressions before they reach `main`/production.

## Review order

1. Scope: does the diff match the stated task?
2. Security/account isolation.
3. Functional correctness/regressions.
4. Provider/network boundaries.
5. Offline/sync semantics if touched.
6. UI/accessibility/responsive behavior if touched.
7. CI/build/deployment implications.
8. Documentation/workplan consistency.
9. Repository hygiene/secrets/generated files.

## Automatic P0 merge blockers

Block merge for:

- auth bypass or normal anonymous app content;
- cross-account library/history/progress/settings/cache exposure;
- RLS weakening without a reviewed equivalent boundary;
- service-role/relay/signing secret exposure;
- arbitrary-URL relay/native fetch capability;
- CAPTCHA/auth/anti-bot circumvention;
- broken core library/reader path;
- production mock/demo fallback;
- merge-conflict markers;
- failing required tests/lint/typecheck/build;
- accidental native push/tag release trigger during PWA phase;
- destructive production-data behavior not explicitly authorized.

## P1 findings

Examples:

- responsive break on a core route;
- inaccessible primary control;
- unclear source error/retry state;
- stale account state after switch;
- sync conflict ambiguity that can lose recent progress;
- service-worker caching behavior that risks stale/account-confused UI;
- docs materially disagree with behavior;
- serious performance regression on large chapter/import workloads.

P1 must be fixed before a production-ready claim unless explicitly accepted/tracked with rationale.

## P2 findings

Minor copy/visual polish or low-risk cleanup that does not undermine core private-user use. Track rather than expand the current PR unnecessarily.

## Required static gate

Web/application changes:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Native-impacting changes also:

```powershell
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

Never hide a failure. Separate verified pre-existing failures from newly introduced failures with evidence.

## Diff hygiene checklist

- [ ] no conflict markers;
- [ ] no secrets/private key/certificate/token;
- [ ] no generated native/build artifacts accidentally tracked;
- [ ] no broad lint/type disable added without narrow justification;
- [ ] no test removed solely to avoid failure;
- [ ] no unrelated formatting/refactor churn;
- [ ] no accidental workflow trigger/permission widening;
- [ ] docs updated when contract changed.

## Route/UX review matrix

Core routes:

- auth;
- library;
- browse;
- manga detail;
- reader;
- import;
- history;
- settings;
- install;
- offline/error/not-found.

Relevant UI changes should be checked at 360px, phone, tablet, desktop, and standalone PWA when applicable.

Check:

- semantic/keyboard/touch operation;
- visible focus;
- loading/empty/error/retry states;
- no horizontal overflow;
- reduced-motion behavior;
- no stale previous account/provider state.

## Reader review

Material reader changes require conventional + long-strip content and validation of auto-scroll, progress restore/save, offline queue/reconnect when touched, background/suspend, keyboard/touch, preload bounds, and reduced motion.

## Auth/data review

Use at least two accounts for any change that could affect ownership. Client filtering is not proof of authorization; inspect RLS/query/cache boundaries.

## Provider review

Provider failures must not fall back to fake content. WeebCentral relay/native command remains operation-limited and source-specific.

## PR/merge/deploy review

Before merge:

- expected branch/base are correct;
- relevant GitHub checks are green;
- Vercel preview/build is successful for runtime changes where available;
- PR contains only intended work;
- deployment implications are understood.

After merge of runtime changes:

- confirm production deployment corresponds to expected `main` commit;
- wait for `READY`;
- smoke anonymous auth behavior;
- smoke affected authenticated flow when credentials are available;
- inspect runtime errors/fatal logs.

A successful build is not the same as a successful production smoke.

## Review output

Report findings by severity with concrete file/behavior evidence. If no blocking finding remains, state which checks/evidence were actually observed and which runtime cases were not exercised.