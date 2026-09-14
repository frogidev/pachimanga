import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tauri = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const tagVersion = process.env.GITHUB_REF?.startsWith('refs/tags/')
  ? process.env.GITHUB_REF_NAME?.replace(/^v/, '')
  : undefined;
const expected = process.env.RELEASE_VERSION || tagVersion;

const versions = {
  package: pkg.version,
  tauri: tauri.version,
  cargo: cargoVersion,
};

const unique = new Set(Object.values(versions));
if (unique.size !== 1) {
  console.error('Native release versions are inconsistent:', versions);
  process.exit(1);
}

if (expected && pkg.version !== expected) {
  console.error(`Release version mismatch: tag/input=${expected}, project=${pkg.version}`);
  process.exit(1);
}

console.log(`Native release version ${pkg.version} is consistent.`);
