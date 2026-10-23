import assert from 'node:assert/strict';
import test from 'node:test';
import { readUi } from './ui-source.ts';

const reader = readUi('src/features/reader/reader-view.tsx');
const shell = readUi('src/components/app-shell.tsx');

test('reader chapter changes replace the current reader history entry', () => {
  assert.match(reader, /const navigateChapter = useCallback/);
  assert.match(reader, /router\.replace\(\`\$\{routeBasePath\}\/\$\{chapterId\}\`\)/);
  assert.match(reader, /ArrowLeft[\s\S]*navigateChapter\(previousChapter\.id\)/);
  assert.match(reader, /ArrowRight[\s\S]*navigateChapter\(nextChapter\.id\)/);
  assert.match(reader, /onChange=\{\(event\) => navigateChapter\(event\.target\.value\)\}/);
  assert.doesNotMatch(reader, /router\.push\(\`\$\{routeBasePath\}\//);
});

test('mobile shell and reader keep safe-area aware chrome and usable touch targets', () => {
  assert.match(shell, /env\(safe-area-inset-top\)/);
  assert.match(shell, /env\(safe-area-inset-bottom\)/);
  assert.match(shell, /size-10[\s\S]*aria-label="Go back"/);
  assert.match(reader, /size-10[\s\S]*aria-label="Close reader"/);
  assert.match(reader, /pb-\[calc\(\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
});
