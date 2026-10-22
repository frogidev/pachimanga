import { PixelSprite } from "@/components/pixel-sprite";

// Hand-drawn pixel-calico head (18x13). Pure SVG rects: crisp at any size, no raster art.
export const CALICO_PALETTE = {
  K: "#2a1a14",
  O: "#f0a04b",
  o: "#d9822f",
  B: "#2b2433",
  W: "#fff6e8",
  P: "#f9a8c4",
  Y: "#fcd34d",
  E: "#1a1117",
  N: "#f08ba8",
};

const HEAD = [
  "..KK..........KK..",
  "..KOK........KBK..",
  "..KOPK......KPBK..",
  "..KOOOKKKKKKBBBK..",
  ".KOOOOOOWWOBBBBBK.",
  ".KOOOOOOWWWBBBBBK.",
  ".KOOYEOOWWWBEYBBK.",
  ".KOOYEOOWWWBEYBBK.",
  ".KOOOOOWWNWWBBBBK.",
  ".KOOOOOWWKWWBBBBK.",
  ".KoOOOOOWWWWBBBBK.",
  "..KOOOOOWWWWBBBK..",
  "...KKKKKKKKKKKK...",
];

export function PachiCalico({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 13" shapeRendering="crispEdges" className={className} aria-hidden="true" role="presentation">
      <PixelSprite rows={HEAD} palette={CALICO_PALETTE} />
    </svg>
  );
}
