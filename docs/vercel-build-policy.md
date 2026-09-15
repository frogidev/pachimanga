# Vercel build policy

Pachimanga uses Vercel Git integration for the hosted Next.js application. `main` remains the production branch and runtime changes still deploy automatically.

## Ignored-build rule

`vercel.json` defines an `ignoreCommand` using `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA`.

Vercel continues a build when any of these hosted-runtime inputs changed:

- `src/**`
- `public/**`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `vercel.json`

If none of those paths changed, the command exits successfully and Vercel ignores the build.

This intentionally skips Vercel compute for changes that do not alter the hosted application, including documentation, Hermes instructions, tests by themselves, native/Tauri-only files, and GitHub workflow-only changes. GitHub Actions quality/hygiene checks remain independent and still run according to their own path filters.

## Why this exists

The project is on a small/private deployment footprint and repeated documentation/agent commits can exhaust Vercel Hobby build-rate limits. Skipping non-runtime builds preserves deployment capacity for actual application changes without disabling automatic `main` deployment.

A Vercel build-rate-limit status is an operational/quota failure, not proof that the application failed to compile. Application CI and Vercel deployment state must be reported separately.

## Safety rules

- Do not remove a path from the runtime list if changing that path can affect the hosted Next.js output.
- Add new build/runtime configuration files to both the `ignoreCommand` path list and Web Quality path filters.
- Environment-variable changes made in Vercel are outside Git diff detection; redeploy intentionally after changing runtime environment values.
- Supabase migrations and relay deployment are separate operational paths and should not require a frontend Vercel build unless application runtime code also changed.
- A release-ready claim still requires the relevant `main` runtime commit to reach Vercel `READY` and pass production smoke checks.
