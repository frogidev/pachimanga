# Account management verification — 2026-09-17

## Scope

This change keeps `/auth` as the public sign-in/recovery entry point and adds a signed-in `/account` surface inside the normal Pachimanga app shell.

Implemented:

- integrated account page linked from Settings, desktop shell and mobile shell;
- profile personalization through allowlisted Supabase user metadata (`display_name`, optional HTTPS `avatar_url`);
- signed-in password change;
- password reset email from both login and account surfaces;
- signup confirmation resend with explicit provider-cooldown guidance;
- confirmation resend remains reachable after an invalid/expired confirmation link;
- registration copy does not claim account creation when Supabase intentionally obscures duplicate-registration state;
- account/session sign-out checks Supabase sign-out success before clearing account-bound local caches;
- `/account` is included in the anonymous protected-route smoke boundary and optional authenticated browser matrix;
- mobile account navigation meets the project touch-target floor and desktop account navigation has explicit keyboard focus treatment;
- static regression tests cover the account-management surfaces and security/UX boundaries above.

No auth confirmation, RLS, provider, native release, or service-role boundary is weakened by this change.

## Automated verification

Runtime-equivalent branch commit `c6fa2a9555fbda1efcd3649beeff7653cbcd0e3e` is up to date with `main` commit `aa7dbcf4b8d893b5bc1cd8e6faf83224b90dcaea` and passed:

- Repository Hygiene run `35258526266`: success;
- Web Quality run `35258526399`: success, including unit tests, lint, typecheck and Next.js production build;
- Production Smoke run `35258526293`: success, including the `/account` anonymous protection boundary;
- PR review threads: none at the latest inspection.

The documentation commit containing this record is runtime-equivalent to the verified code above.

## Hosted preview blocker

Vercel preview/build evidence is still unavailable for the exact PR branch because the Hobby deployment build-rate limit reports `Deployment rate limited — retry in 24 hours.`

This is a platform-capacity blocker, not an application pass. Keep the runtime PR unmerged until a successful exact-head preview/build can be obtained under the active project policy.

## Manual release-candidate evidence still required

Do not mark the PWA release-candidate gate complete until real identities/devices verify:

- registration and confirmation email;
- resend-confirmation behavior including provider cooldown/rate-limit state;
- invalid/expired confirmation link recovery;
- forgot-password email and recovery link;
- signed-in password change followed by fresh sign-in;
- profile persistence across sign-out/sign-in and a second session;
- Account A -> B -> A isolation;
- installed-PWA account/security layout on representative mobile and desktop devices.
