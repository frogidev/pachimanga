import { mkdir, readdir } from "node:fs/promises";
import { dirname, extname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "..", "public", "ai-art", "raw");
const OUT_DIR = join(HERE, "..", "public", "ai-art");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(RAW_DIR).catch(() => []))
    .filter((file) => [".png", ".jpg", ".jpeg", ".webp"].includes(extname(file).toLowerCase()));
  if (!files.length) {
    console.log("No raw images in public/ai-art/raw.");
    return;
  }
  for (const file of files) {
    const name = parse(file).name;
    const base = sharp(join(RAW_DIR, file)).resize({ width: 160 }).posterize(4);
    await base.clone().webp({ quality: 85 }).toFile(join(OUT_DIR, `${name}.webp`));
    await base.clone().avif({ quality: 80 }).toFile(join(OUT_DIR, `${name}.avif`));
    console.log(`Wrote ${name}.webp + ${name}.avif`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
