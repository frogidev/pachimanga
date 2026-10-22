import { spriteRects, type Palette } from "@/lib/pixel-art";

type Props = {
  rows: readonly string[];
  palette: Palette;
  x?: number;
  y?: number;
};

/** Renders an ASCII sprite as crisp SVG rects; place it inside an <svg>. */
export function PixelSprite({ rows, palette, x = 0, y = 0 }: Props) {
  return (
    <g transform={x || y ? `translate(${x} ${y})` : undefined}>
      {spriteRects(rows, palette).map((rect, index) => (
        <rect key={index} x={rect.x} y={rect.y} width={rect.w} height={1} fill={rect.fill} />
      ))}
    </g>
  );
}
