import { readdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, "..", "public", "ai-art", "raw");
const OUT = join(HERE, "..", "public", "ai-art");

const files = (await readdir(RAW)).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
if (!files.length) {
  console.log("No raw images in public/ai-art/raw.");
  process.exit(0);
}
for (const file of files) {
  const name = parse(file).name;
  const img = sharp(join(RAW, file));
  const meta = await img.metadata();
  // Nearest-neighbor downscale keeps chunky pixels crisp; cap width at 1440.
  const w = Math.min(meta.width || 1440, 1440);
  await img
    .clone()
    .resize({ width: w, kernel: "nearest" })
    .avif({ quality: 55, effort: 6 })
    .toFile(join(OUT, `${name}.avif`));
  await img
    .clone()
    .resize({ width: w, kernel: "nearest" })
    .webp({ quality: 75 })
    .toFile(join(OUT, `${name}.webp`));
  console.log(`Optimized ${name} (${meta.width}x${meta.height} -> w${w})`);
}
