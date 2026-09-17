import assert from 'node:assert/strict';

const BASE_URL = (process.env.BASE_URL || 'https://pachimanga.frogilab.dev').replace(/\/$/, '');
const ACCOUNT_A = {
  email: process.env.PACHIMANGA_E2E_EMAIL || '',
  password: process.env.PACHIMANGA_E2E_PASSWORD || '',
};
const ACCOUNT_B = {
  email: process.env.PACHIMANGA_E2E_EMAIL_B || '',
  password: process.env.PACHIMANGA_E2E_PASSWORD_B || '',
};

const protectedPaths = ['/', '/library', '/browse', '/import', '/history', '/settings'];
const viewports = [
  { name: 'phone-320', width: 320, height: 720 },
  { name: 'phone-360', width: 360, height: 800 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

function configured(account) {
  return Boolean(account.email && account.password);
}

async function loadChromium() {
  try {
    const { chromium } = await import('playwright');
    return chromium;
  } catch {
    throw new Error(
      'Browser E2E requires Playwright in the execution environment. The Pachimanga project does not install it as a dependency; run this optional evidence check only from an environment where Playwright and Chromium are already available.',
    );
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    sizes.scrollWidth <= sizes.clientWidth + 1,
    `${label}: horizontal overflow (${sizes.scrollWidth}px > ${sizes.clientWidth}px)`,
  );
}

async function assertKeyboardFocusVisible(page, label) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    return {
      tagName: element.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth || '0'),
      boxShadow: style.boxShadow,
    };
  });
  assert.ok(focus && focus.tagName !== 'BODY', `${label}: Tab did not move focus to an interactive element`);
  assert.ok(
    (focus.outlineStyle !== 'none' && focus.outlineWidth > 0) || (focus.boxShadow && focus.boxShadow !== 'none'),
    `${label}: keyboard focus is not visibly indicated`,
  );
}

async function assertInteractiveLabels(page, label) {
  const unlabeled = await page.evaluate(() => Array.from(document.querySelectorAll('button, a[href]'))
    .filter((element) => {
      const text = element.textContent?.trim();
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      const title = element.getAttribute('title')?.trim();
      const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim();
      return !text && !ariaLabel && !title && !imageAlt;
    })
    .map((element) => element.outerHTML.slice(0, 180)));
  assert.deepEqual(unlabeled, [], `${label}: found unlabeled interactive controls: ${unlabeled.join(' | ')}`);
}

async function assertAuthExperience(page, label) {
  await page.getByRole('heading', { name: 'Sign in to Pachimanga' }).waitFor();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Register', exact: true }).waitFor();
  await assertNoHorizontalOverflow(page, label);
  await assertInteractiveLabels(page, label);
  await assertKeyboardFocusVisible(page, label);
}

async function login(context, account, label) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 }),
    page.getByRole('button', { name: 'Sign in', exact: true }).click(),
  ]);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Welcome to/i }).waitFor({ timeout: 20_000 });
  const owner = await page.evaluate(() => localStorage.getItem('pachimanga:cache-owner'));
  assert.ok(owner, `${label}: account-bound cache owner was not established`);
  return { page, owner };
}

async function signOut(page, label) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  const button = page.getByRole('button', { name: 'Sign out' });
  await button.waitFor({ timeout: 20_000 });
  await button.click();
  await page.getByRole('heading', { name: 'Sign in to Pachimanga' }).waitFor({ timeout: 20_000 });
  const owner = await page.evaluate(() => localStorage.getItem('pachimanga:cache-owner'));
  assert.equal(owner, null, `${label}: cache owner remained after sign-out`);
}

async function runAnonymousMatrix(browser) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await assertAuthExperience(page, `${viewport.name} /auth`);

    await page.goto(`${BASE_URL}/offline`, { waitUntil: 'domcontentloaded' });
    await page.getByText(/offline/i).first().waitFor();
    await assertNoHorizontalOverflow(page, `${viewport.name} /offline`);
    await assertInteractiveLabels(page, `${viewport.name} /offline`);
    await assertKeyboardFocusVisible(page, `${viewport.name} /offline`);

    for (const path of protectedPaths) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      assert.ok(new URL(page.url()).pathname.startsWith('/auth'), `${viewport.name} ${path}: did not resolve to auth`);
      await assertAuthExperience(page, `${viewport.name} ${path}`);
    }

    await context.close();
  }
}

async function runAuthenticatedMatrix(browser) {
  if (!configured(ACCOUNT_A)) {
    console.log('Authenticated browser E2E skipped: PACHIMANGA_E2E_EMAIL/PASSWORD not configured.');
    return;
  }

  const firstContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const first = await login(firstContext, ACCOUNT_A, 'account A / first session');
  const second = await login(secondContext, ACCOUNT_A, 'account A / second session');
  assert.equal(second.owner, first.owner, 'same account produced different cache-owner bindings across sessions');

  await first.page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await first.page.getByRole('heading', { name: 'Settings' }).waitFor();
  await assertNoHorizontalOverflow(first.page, 'authenticated /settings');
  await assertInteractiveLabels(first.page, 'authenticated /settings');
  await assertKeyboardFocusVisible(first.page, 'authenticated /settings');
  await signOut(first.page, 'account A / first session');
  await firstContext.close();
  await secondContext.close();

  if (!configured(ACCOUNT_B)) {
    console.log('Two-account browser isolation skipped: account B secrets not configured.');
    return;
  }

  const accountBContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const accountB = await login(accountBContext, ACCOUNT_B, 'account B');
  assert.notEqual(accountB.owner, first.owner, 'different accounts shared the same cache-owner binding');
  await signOut(accountB.page, 'account B');
  await accountBContext.close();

  const returnContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const returned = await login(returnContext, ACCOUNT_A, 'account A / return session');
  assert.equal(returned.owner, first.owner, 'account A did not restore its own cache-owner binding after account B');
  await signOut(returned.page, 'account A / return session');
  await returnContext.close();
}

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true });
try {
  await runAnonymousMatrix(browser);
  await runAuthenticatedMatrix(browser);
  console.log(`Browser E2E passed for ${BASE_URL}`);
} finally {
  await browser.close();
}
