// Hand-plotted pixel-calico mascot. Crisp SVG rects: no background, no AI
// artifacts, sharp at any size. Grid is 20x24; head occupies rows 0-11.
const O = "#e8933c";
const B = "#241a12";
const W = "#fff7ed";
const A = "#fbbf24";
const P = "#f9a8d4";
const D = "#120c08";

type R = [number, number, number, number, string];

const RECTS: R[] = [
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
  [4, 11, 12, 9, O],
  [12, 11, 4, 9, B],
  [7, 11, 6, 9, W],
  [7, 13, 3, 3, O],
  [6, 18, 3, 3, W], [11, 18, 3, 3, W],
  [7, 20, 1, 1, D], [12, 20, 1, 1, D],
  [6, 21, 3, 1, W], [11, 21, 3, 1, W],
  [16, 14, 3, 2, B], [17, 16, 2, 3, O], [16, 19, 3, 2, B], [15, 20, 2, 1, O],
  [4, 18, 2, 3, B],
];

export function PachiCalico({ className = "", variant = "full" }: { className?: string; variant?: "full" | "head" }) {
  const viewBox = variant === "head" ? "0 0 20 12" : "0 0 20 24";
  return (
    <svg viewBox={viewBox} shapeRendering="crispEdges" className={className} aria-hidden="true" role="presentation">
      {RECTS.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}
