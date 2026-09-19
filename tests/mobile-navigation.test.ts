import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const reader = readFileSync(join(ROOT, 'src/features/reader/reader-view.tsx'), 'utf8');
const shell = readFileSync(join(ROOT, 'src/components/app-shell.tsx'), 'utf8');

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
  assert.match(shell, /aria-label="Go back"[\s\S]*size-10/);
  assert.match(reader, /aria-label="Close reader"[\s\S]*size-10/);
  assert.match(reader, /pb-\[calc\(\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
});
