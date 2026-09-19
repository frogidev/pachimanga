import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
const artDirection = readFileSync(join(ROOT, 'docs/art-direction.md'), 'utf8');
const mangaDetail = readFileSync(join(ROOT, 'src/features/manga/manga-detail.tsx'), 'utf8');

test('light theme maps dark application surfaces to warm light surfaces', () => {
  assert.match(css, /html\[data-theme="light"\][\s\S]*bg-\[\#171723\]/);
  assert.match(css, /html\[data-theme="light"\][\s\S]*bg-\[\#12121b\]/);
  assert.match(css, /html\[data-theme="light"\][\s\S]*bg-\[\#14141d\]/);
  assert.match(css, /section\[aria-label="Library collections"\]/);
  assert.match(css, /\.group:hover \.manga-card/);
});

test('light theme gives fields, secondary buttons and muted text explicit contrast', () => {
  assert.match(css, /--light-text: #211c18/);
  assert.match(css, /\.field,[\s\S]*\.app-search input,[\s\S]*select/);
  assert.match(css, /\.button-secondary:hover/);
  assert.match(css, /input::placeholder/);
});

test('art direction documents light mode as an intentional warm-paper theme', () => {
  assert.match(artDirection, /### Light theme/);
  assert.match(artDirection, /warm paper counterpart/);
  assert.match(artDirection, /Media overlays may remain dark/);
});


test('light auth keeps hero copy readable and neutralizes browser autofill blue', () => {
  const authPage = readFileSync(join(ROOT, 'src/app/auth/page.tsx'), 'utf8');
  assert.match(authPage, /auth-intro-card/);
  assert.match(authPage, /auth-intro-note/);
  assert.match(css, /html\[data-theme="light"\] \.auth-intro-card/);
  assert.match(css, /input\.field:-webkit-autofill/);
});


test('manga detail hero has an explicit warm-paper light surface', () => {
  assert.match(mangaDetail, /manga-detail-hero/);
  assert.doesNotMatch(mangaDetail, /bg-gradient-to-br from-\[#171520\] to-\[#0f0e15\]/);
  assert.match(css, /html\[data-theme="light"\] \.manga-detail-hero/);
  assert.match(css, /linear-gradient\(145deg, #fffdfa, #f3ebe2\)/);
});
