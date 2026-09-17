# Account management verification — 2026-09-17

## Scope

This change keeps `/auth` as the public sign-in/recovery entry point and adds a signed-in `/account` surface inside the normal Pachimanga app shell.

Implemented:

- integrated account page linked from Settings, desktop shell and mobile shell;
- profile personalization through safe Supabase user metadata (`display_name`, optional HTTPS `avatar_url`);
- signed-in password change;
- password reset email from both login and account surfaces;
- signup confirmation resend with explicit provider-cooldown guidance;
- account/session sign-out that clears account-bound local caches;
- static regression tests for the account-management surfaces.

No auth confirmation, RLS, provider, native release, or service-role boundary is weakened by this change.

## Verification required before merge

- Repository Hygiene: pending.
- Web Quality (`npm ci`, unit tests, lint, typecheck, production build): pending.
- Vercel preview/build for exact PR head: pending.
- Review-thread state: pending.

## Manual production evidence still required

Do not mark the PWA release-candidate gate complete until a real account verifies:

- registration and confirmation email;
- resend-confirmation behavior including provider cooldown/rate-limit state;
- forgot-password email and recovery link;
- signed-in password change followed by fresh sign-in;
- profile persistence across sign-out/sign-in and a second session;
- Account A -> B -> A isolation;
- installed-PWA account/security layout on representative mobile and desktop devices.
