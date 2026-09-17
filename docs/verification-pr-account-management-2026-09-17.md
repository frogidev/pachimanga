# Account management verification — 2026-09-17

## Final merged scope

PR #68 consolidated signed-in account management into Settings while keeping `/auth` as the public sign-in/confirmation/recovery entry point.

Implemented:

- `/settings#account` contains profile personalization and password/security controls;
- `/account` remains protected and redirects to `/settings#account` for compatibility;
- allowlisted Supabase user metadata supports `display_name` and optional HTTPS `avatar_url`;
- signed-in password change is available;
- reset-password email can be requested from auth and Settings;
- signup confirmation can be resent with explicit cooldown/rate-limit guidance;
- confirmation resend remains reachable after an invalid/expired confirmation link;
- registration copy avoids claiming account creation when Supabase intentionally obscures duplicate-registration state;
- sign-out verifies Supabase `signOut()` success before clearing account-bound local caches;
- sign-out is the final Settings action rather than part of the account card;
- the redundant Settings Import card was removed because Import already has a primary navigation destination;
- theme selection was removed from the Settings card stack and exposed as a quick shell toggle;
- `/account` remains included in protected-route smoke/browser boundary coverage.

No auth confirmation, RLS, provider, native-release, or service-role boundary was weakened.

## Automated verification

Final PR #68 head:

`0e4fdb5eefd2f870c9e47435ac40ccec9735ff92`

Observed:

- Repository Hygiene run `35283970854`: success;
- Web Quality run `35283970876`: success, including dependency installation, unit tests, lint, typecheck, and Next.js production build;
- Production Smoke run `35283970838`: success;
- final review threads: none.

Earlier Web Quality attempts correctly failed when the sign-out component moved but the static regression test still inspected `account-settings.tsx`. The test was updated to assert the new `sign-out-settings.tsx` boundary; the final run then passed. This failure is preserved as useful regression evidence rather than hidden.

## Merge and production

PR #68 was squash-merged as:

`c9060fd177b7d3cdf607cbde1945af875e283fa7`

Exact production deployment:

`dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` — `READY`

Vercel preview creation was intermittently rate-limited by the Hobby plan, but the exact merged runtime deployed successfully. Production error/fatal inspection for that deployment returned no matching entries in the inspected post-deploy window.

## Manual release-candidate evidence still required

Do not mark the PWA release-candidate gate complete until real identities/devices verify:

- registration and confirmation email;
- confirmation resend including provider cooldown/rate-limit state;
- invalid/expired confirmation-link recovery;
- forgot-password email and recovery link;
- signed-in password change followed by fresh sign-in;
- profile persistence across sign-out/sign-in and a second session;
- Account A -> B -> A isolation;
- installed-PWA account/security layout on representative mobile and desktop devices.
