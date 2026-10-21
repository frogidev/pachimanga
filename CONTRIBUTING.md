# Contributing to Pachimanga

Before making changes, read [AGENTS.md](AGENTS.md), [docs/WORKPLAN.md](docs/WORKPLAN.md), and the most recent [production evidence](docs/verification-release-2026-09-20.md). Use [README.md](README.md) for local setup.

## Working agreement

- Branch from fresh `main`, one topic per branch. Use `fix/`, `feat/`, `docs/`, or `chore/` prefixes.
- Preserve mandatory authentication, RLS, owner-bound caches/offline data, private response caching, and source/relay operation restrictions.
- No direct pushes to `main`. Open a focused pull request, explain scope, include tests/evidence, and use the repository's **squash-merge** policy once checks pass.
- Required PR checks are Repository Hygiene (`hygiene`) and Web Quality (`quality`). Runtime work must genuinely pass unit tests, lint, app/test typechecking, and production build. Native changes require Native Quality and separate manual-release permission.
- Never silently alter a production Supabase schema, production identity data, signing policy, or release workflow.
- Keep implementation, regression tests, `docs/WORKPLAN.md`, and relevant architecture/behavior documentation aligned.

## Quick validation

```bash
npm ci
npm run verify
node scripts/check-native-version.mjs
```

For Rust/Tauri-impacting changes, additionally run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Do not claim the gate passed without running it or inspecting successful CI for the **exact** revision. Inspect the changed-file list for credentials, conflict markers, generated artifacts, and unrelated work before requesting merge.

## Immediate backlog — verified against 2026-10-20 repository audit

### P0: dependency security

Review Next.js `16.3.3` against current security advisories and upgrade to a patched, supported 16.x release in a focused PR after compatible checks. Confirm `eslint-config-next` matches `next`; run `npm audit --omit=dev`, full `npm audit`, tests/lint/typecheck/build, and affected-route smoke checks. Do not force-install incompatible versions.

### P1: tooling and deterministic builds

Resolve the unsupported ESLint 9 lockfile version through a supported compatible configuration (verify Next.js lint rules on the candidate), inspect npm outdated/audit results, and verify Cargo lockfile policy for this native application. Commit only intentionally generated, reviewed lockfile changes. Maintain the Node 22 CI baseline until a separately tested runtime upgrade.

### P1: post-release real-device and account validation

Perform the manual cases still open in [docs/WORKPLAN.md](docs/WORKPLAN.md): fresh signup/email confirmation/recovery, Account A → B → A in one browser, two-device sync/clock-skew, PWA install and service-worker updates on phone/tablet/desktop, paged and long-strip readers, and representative import formats. Use disposable identities and redacted diagnostics.

### P2: repo hygiene follow-through

Retire the stale `docs/sync-post-pr85-production-state` branch **only after** creating an archive ref and confirming that its Git tree equals the squash-merged `main` tree. Review `public/ai-art/raw` and `public/brand-concept.png` for necessary source/design provenance before deleting any assets. Verify unused code/exports using dependency-aware analysis; do not delete solely on a filename heuristic.

### P2: current user feedback

Triage reproducible post-release behavior, reliability, accessibility, provider correctness and mobile UI friction before adding speculative functionality. Update workplan acceptance criteria and evidence for each coherent batch.

## Definition of done

A change is complete only when the intended behavior, relevant regression coverage, reproducible checks, documentation, PR status, and (when necessary) production smoke/deployment evidence agree. The September 20 release record is historical evidence, not a claim that all October 20 security or physical-device checks are green.
