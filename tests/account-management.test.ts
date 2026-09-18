import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function source(path: string) {
  return readFileSync(join(ROOT, path), 'utf8');
}

const accountPage = source('src/app/account/page.tsx');
const accountSettings = source('src/components/account-settings.tsx');
const authForm = source('src/components/AuthForm.tsx');
const appShell = source('src/components/app-shell.tsx');
const settingsPage = source('src/app/settings/page.tsx');
const signOutSettings = source('src/components/sign-out-settings.tsx');
const productionSmoke = source('ops/production-smoke.mjs');
const browserE2E = source('ops/browser-e2e.mjs');

test('signed-in account management is consolidated into Settings', () => {
  assert.match(settingsPage, /<AccountSettings\s*\/>/);
  assert.match(settingsPage, /id="account"/);
  assert.match(accountPage, /redirect\('\/settings#account'\)/);
  assert.doesNotMatch(appShell, /href="\/account"/);
  assert.doesNotMatch(settingsPage, /href="\/account"/);
  assert.doesNotMatch(settingsPage, /href="\/auth"[^>]*>Manage account/);
});

test('account profile supports safe personalization without exposing credentials', () => {
  assert.match(accountSettings, /display_name/);
  assert.match(accountSettings, /avatar_url/);
  assert.match(accountSettings, /Avatar URL/);
  assert.match(accountSettings, /parsed\.protocol !== 'https:'/);
  assert.doesNotMatch(accountSettings, /access_token|refresh_token|service_role|password_hash/);
});

test('account security exposes password change and recovery email actions', () => {
  assert.match(accountSettings, /auth\.updateUser\(\{ password: newPassword \}\)/);
  assert.match(accountSettings, /resetPasswordForEmail/);
  assert.match(accountSettings, /Change password/);
  assert.match(accountSettings, /Send reset email/);
});

test('auth and account sign-out do not clear local ownership after a rejected sign-out', () => {
  assert.match(authForm, /const \{ error \} = await sb\.auth\.signOut\(\);\s*if \(error\) throw error;/s);
  assert.match(signOutSettings, /const \{ error \} = await sb\.auth\.signOut\(\);\s*if \(error\) throw error;/s);
  assert.match(authForm, /await Promise\.all\(\[clearLocalUserCache\(\), clearChapterCache\(\)\]\)/);
  assert.match(signOutSettings, /await Promise\.all\(\[clearLocalUserCache\(\), clearChapterCache\(\)\]\)/);
});

test('registration can resend confirmation without weakening confirmation requirements', () => {
  assert.match(authForm, /auth\.resend\(\{/);
  assert.match(authForm, /type: 'signup'/);
  assert.match(authForm, /Resend confirmation/);
  assert.match(authForm, /mode === 'signup' \|\| urlMessage\.includes\('confirmation'\)/);
  assert.match(authForm, /emailRedirectTo: confirmationRedirect\(\)/);
  assert.doesNotMatch(authForm, /mailer_autoconfirm|enable_confirmations\s*=\s*false/i);
});

test('account compatibility route stays protected and browser coverage exercises Settings account controls', () => {
  assert.match(productionSmoke, /'\/account'/);
  assert.match(browserE2E, /'\/account'/);
  assert.match(browserE2E, /Personalize your account/);
  assert.match(browserE2E, /\/settings#account/);
});


test('profile personalization uses profiles as canonical storage and keeps Auth metadata as compatibility mirror', () => {
  assert.match(accountSettings, /\.from\('profiles'\)/);
  assert.match(accountSettings, /\.upsert\(\{/);
  assert.match(accountSettings, /display_name: displayName/);
  assert.match(accountSettings, /avatar_url: avatarUrl \|\| null/);
  assert.match(accountSettings, /auth\.updateUser\(\{/);
});
