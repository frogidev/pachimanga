// Renders PWA/favicon icons from the hand-plotted pixel-calico.
// Rect data mirrors src/components/pachi-calico.tsx — keep in sync.
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const O = "#e8933c";
const B = "#241a12";
const W = "#fff7ed";
const A = "#fbbf24";
const P = "#f9a8d4";
const D = "#120c08";

const R = [
  [2, 0, 4, 1, O], [2, 1, 4, 2, O], [2, 3, 6, 1, O],
  [14, 0, 4, 1, B], [14, 1, 4, 2, B], [12, 3, 6, 1, B],
  [3, 1, 2, 2, P], [15, 1, 2, 2, P],
  [3, 4, 14, 4, O],
  [11, 3, 7, 6, B],
  [6, 8, 8, 3, W],
  [5, 5, 3, 2, A], [12, 5, 3, 2, A],
  [6, 5, 1, 2, D], [13, 5, 1, 2, D],
  [9, 8, 2, 1, P],
  [9, 9, 1, 1, D], [10, 9, 1, 1, D], [8, 10, 1, 1, D], [11, 10, 1, 1, D],
  [1, 7, 2, 1, W], [17, 7, 2, 1, W], [1, 9, 2, 1, W], [17, 9, 2, 1, W],
];

const HERE = dirname(fileURLToPath(import.meta.url));
const ICONS = join(HERE, "..", "public", "icons");
const PUB = join(HERE, "..", "public");

const rects = R.map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join("");
// Head viewBox (0 0 20 12) with 2 units of dark padding all around.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 24 16" shape-rendering="crispEdges"><rect x="-2" y="-2" width="24" height="16" fill="#101018"/>${rects}</svg>`;
const buf = Buffer.from(svg);

async function png(size, dest, { pad = false } = {}) {
  let img = sharp(buf).resize(size, Math.round((size * 16) / 24), { kernel: "nearest" });
  if (pad) {
    img = img.extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#101018" }).resize(512, 512, { kernel: "nearest" });
  }
  await img.png().toFile(dest);
  console.log("wrote", dest);
}

await png(512, join(ICONS, "icon-512.png"));
await png(192, join(ICONS, "icon-192.png"));
await png(512, join(ICONS, "icon-512-maskable.png"), { pad: true });
await png(180, join(PUB, "apple-touch-icon.png"));
await writeFile(join(HERE, "calico-icons.stamp"), new Date().toISOString());
