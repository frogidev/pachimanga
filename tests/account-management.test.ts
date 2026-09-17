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
const productionSmoke = source('ops/production-smoke.mjs');
const browserE2E = source('ops/browser-e2e.mjs');

test('signed-in account management lives inside the normal app shell', () => {
  assert.match(accountPage, /<AccountSettings\s*\/>/);
  assert.match(appShell, /href="\/account"/);
  assert.match(settingsPage, /href="\/account"/);
  assert.match(appShell, /aria-label="Manage account"[^>]*size-10/);
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

test('registration can resend confirmation without weakening confirmation requirements', () => {
  assert.match(authForm, /auth\.resend\(\{/);
  assert.match(authForm, /type: 'signup'/);
  assert.match(authForm, /Resend confirmation/);
  assert.match(authForm, /mode === 'signup' \|\| urlMessage\.includes\('confirmation'\)/);
  assert.match(authForm, /emailRedirectTo: confirmationRedirect\(\)/);
  assert.doesNotMatch(authForm, /mailer_autoconfirm|enable_confirmations\s*=\s*false/i);
});

test('account route is included in anonymous boundary and optional browser coverage', () => {
  assert.match(productionSmoke, /'\/account'/);
  assert.match(browserE2E, /'\/account'/);
  assert.match(browserE2E, /Your Pachimanga account/);
  assert.match(browserE2E, /Personalize your account/);
});
