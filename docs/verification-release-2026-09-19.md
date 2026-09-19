# Pachimanga v1.0.2 release verification — 2026-09-19

This document is the current release record for the authenticated PWA/web product. It supersedes `verification-release-2026-09-18.md` as the current-state release document while preserving that file as historical v0.4.0 evidence.

## Release identity

```text
release:              v1.0.2
release PR:           #83
release branch head:  b8864ddf6266151a47ae2e44f49343be81a8d678
release main/runtime: 2fae75f7ed35295bd906babcd26da2ad24d47f37
runtime-equivalent preview: dpl_3iT8XMyGRpsiUgr3WrNTAv4SuWix (READY)
production deployment:dpl_Bu1WMVwVjqg3f9M4ccH91HvdfaZJ
production state:     READY
production alias:     https://pachimanga.frogilab.dev
```

The owner designated the current product line as v1.0.2. PR #83 merged through the protected squash-merge path, and the exact merged runtime reached the production alias in `READY` state.

No GitHub Release, version tag, native artifact, signing action, store submission, or production data/schema mutation is implied by the v1.0.2 designation.

## What v1.0.2 represents

v1.0.2 consolidates the released v0.4.0 baseline with the post-release fixes already merged through PR #82:

- PR #77: stable Web Vitals callback/route attribution;
- PR #79: mobile theme access, real list layout, card/menu cleanup, factual Browse membership, and synchronized chapter read-state hydration;
- PR #80: mobile Library layout control scoped to the content it changes;
- PR #81: mobile sort/status controls scoped to Your Library, phone collection management hidden, and misleading Continue Reading sort action removed;
- PR #82: explicit warm-paper manga-detail light surface plus reader chapter navigation that replaces browser history so Android/browser Back does not replay chapter hops.

The v1.0.2 release/versioning batch also:

- aligns `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` on version `1.0.2`;
- updates the shell version label to `v1.0.2`;
- synchronizes current-state documentation with the new release line;
- records that GitHub Actions was observed available again on 2026-09-19.

## Repository and branch audit

At release preparation time there were no pre-existing open pull requests. PR #83 was the dedicated v1.0.2 release/versioning PR.

The non-`main` branches present before this release-preparation branch all map to already-merged PRs and are cleanup candidates rather than pending work:

- `chore/windows-local-launcher` — PR #70;
- `docs/record-fresh-production-smoke` — PR #71;
- `feat/account-profile-shell` — PR #74;
- `docs/release-v0.4.0` — PR #75;
- `docs/post-release-feedback-workflow` — PR #76;
- `fix/web-vitals-route-attribution` — PR #77;
- `docs/post-release-web-vitals-evidence` — PR #78;
- `fix/mobile-library-feedback` — PR #79;
- `fix/mobile-library-layout-toggle` — PR #80;
- `fix/mobile-library-controls` — PR #81;
- `fix/light-theme-mobile-reader-navigation` — PR #82;
- `release/v1.0.2` — PR #83 (merged; cleanup candidate after release finalization).

Because the repository uses squash merges, these old branch tips can still appear "ahead" or "diverged" from `main`; that does not mean their work is pending. Cleanup must be based on the merged PR state, not ancestry alone.

## Evidence carried into v1.0.2

The current production baseline immediately before the version/documentation bump was:

```text
main/runtime: ba8083df5a51ea352f84aecceadae29be3e4983d
production:   dpl_FHgi5LHcMKhrvQd8pupPMd8UcKbc
state:        READY
alias:        https://pachimanga.frogilab.dev
```

Observed for PR #82 / that runtime:

- Repository Hygiene: success;
- Web Quality: success, including unit tests, lint, typecheck, and production build;
- Native Quality: success, including JavaScript checks, Rust shell check, and version consistency;
- exact production deployment reached `READY` with no alias error;
- anonymous root resolved to the mandatory auth surface with `private, no-store`;
- inspected Vercel runtime `error`/`fatal` window was empty.

PR #83 release/versioning evidence:

- Repository Hygiene: success;
- Web Quality: success, including unit tests, lint, typecheck, and production build;
- Native Quality: success, including JavaScript checks, Rust shell check, and version consistency at `1.0.2`;
- runtime-changing release-prep commit `001a6d0d8aa03ec5eab1c280d31fd4f1915f5b96` produced Vercel preview `dpl_3iT8XMyGRpsiUgr3WrNTAv4SuWix`, `READY`;
- later release-branch commits were documentation-only, so their Vercel attempts were correctly canceled by the ignored-build policy without changing hosted runtime output;
- protected squash merge produced runtime `2fae75f7ed35295bd906babcd26da2ad24d47f37`;
- production deployment `dpl_Bu1WMVwVjqg3f9M4ccH91HvdfaZJ` reached `READY` with no alias error;
- anonymous root returned the mandatory auth experience with `Cache-Control: private, no-store`;
- inspected Vercel runtime errors and production `error`/`fatal` logs were empty in the post-deploy window.

An exact-final-v1.0.2 credential-free Production Smoke was not executed in this agent session and remains explicitly outstanding rather than inferred from the checks above.

## Security and data boundaries

v1.0.2 does not change the core security/data contract:

- authentication remains mandatory;
- Supabase RLS remains the final row-isolation boundary;
- browser-local state and explicit offline chapter downloads remain account-bound;
- authenticated responses remain private/non-shared-cacheable where expected;
- provider errors remain explicit;
- WeebCentral relay/native bridges remain source-specific and operation-limited;
- no production guest/demo/mock fallback is introduced;
- no schema/RLS/auth mutation is part of the version/documentation batch.

The production migration `20260918010000_pwa_collections_profile_and_clear_rpc.sql` remains the current schema baseline.

## Evidence not fabricated by the release designation

The following remain useful post-release/manual evidence and are not marked complete merely because the product is called v1.0.2:

- fresh registration/confirmation/recovery against real mail delivery;
- Account A -> B -> A isolation on a shared browser profile;
- same-account two-session/two-device synchronization and near-simultaneous updates;
- installed-PWA validation across iPhone/iPad/Android/desktop;
- physical-device conventional and long-strip reader testing;
- representative OCR/Tachiyomi/Tachimanga import samples;
- exact-final-v1.0.2 Production Smoke if it has not yet been observed after the final deployment.

## Historical record

`verification-release-2026-09-18.md` remains the immutable historical evidence for v0.4.0. Later fixes and checks must not be rewritten into that older record as though they occurred on the v0.4.0 release runtime.
