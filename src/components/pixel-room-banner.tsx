import { CALICO_PALETTE } from "@/components/pachi-calico";
import { PixelSprite } from "@/components/pixel-sprite";

const SLEEPING_CAT = [
  ".KK..KK...................",
  "KOOKKOOK..................",
  "KOOOOOOK....KKKKKKKKKK....",
  "KOOOOOOKOOOOOOOWWBBBBBBBBK",
  "KOKOOKOKOOOOOOOWWBBBBBBBBK",
  "KOWWNWOKOOOOOOWWWWBBBBBBBK",
  ".KWWWWK.OOOOOOWWWWBBBBBBBK",
  "..KKKKKKKOOOOOWWWWWBBBBBBK",
  "........KKKKKKKKKKKKKKKKK.",
];

const BOOK_COLORS = ["#c2417a", "#e8933c", "#4f7cac", "#7a5ea8", "#3f9c82", "#d9a441"];
const SKY = ["#3b2a5c", "#5c3a7a", "#a24d8b", "#e56f8f", "#f5a169", "#fbd08a"];
const SKYLINE = [
  [40, 17, 4], [45, 14, 3], [49, 19, 5], [55, 12, 4], [60, 18, 4], [66, 15, 3], [70, 20, 4], [75, 16, 3], [79, 18, 3],
] as const;

const Z = ["ZZZ", ".Z.", "ZZZ"];

function Bookshelf() {
  const shelves = [10, 18, 26];
  return (
    <g>
      <rect x="3" y="3" width="30" height="26" fill="#2a1d2b" />
      {shelves.map((y, shelf) => (
        <g key={y}>
          {Array.from({ length: 9 }, (_, index) => {
            const height = 4 + ((index * 3 + shelf * 2) % 4);
            return <rect key={index} x={5 + index * 3} y={y - height} width={2} height={height} fill={BOOK_COLORS[(index + shelf) % BOOK_COLORS.length]} />;
          })}
          <rect x="3" y={y} width="30" height="1" fill="#6b4630" />
        </g>
      ))}
    </g>
  );
}

export function PixelRoomBanner() {
  return (
    <section className="pixel-room-banner" aria-label="Pachimanga reading room artwork">
      <svg viewBox="0 0 120 36" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" className="absolute inset-0 h-full w-full" aria-hidden="true" role="presentation">
        <rect width="120" height="36" fill="#1d1626" />
        <rect y="28" width="120" height="8" fill="#2a1c2c" />

        <Bookshelf />

        <rect x="36" y="2" width="48" height="26" fill="#120d18" />
        {SKY.map((fill, index) => (
          <rect key={fill} x="38" y={3 + index * 4} width="44" height="4" fill={fill} />
        ))}
        <rect x="56" y="22" width="8" height="2" fill="#fff1c9" />
        <rect x="57" y="21" width="6" height="1" fill="#fff1c9" />
        {SKYLINE.map(([x, top, width]) => (
          <g key={x}>
            <rect x={x} y={top} width={width} height={27 - top} fill="#2d1c40" />
            <rect x={x + 1} y={top + 2} width="1" height="1" fill="#fbd08a" />
            {width > 3 ? <rect x={x + 3} y={top + 4} width="1" height="1" fill="#fbd08a" /> : null}
          </g>
        ))}
        <rect x="59" y="3" width="2" height="25" fill="#120d18" />
        <rect x="36" y="27" width="48" height="2" fill="#4a3358" />

        <rect x="92" y="24" width="8" height="5" fill="#b4573a" />
        <rect x="93" y="23" width="6" height="1" fill="#8e4129" />
        <rect x="95" y="16" width="2" height="7" fill="#3f9c5a" />
        <rect x="92" y="18" width="3" height="2" fill="#4fb36b" />
        <rect x="97" y="14" width="3" height="3" fill="#4fb36b" />
        <rect x="93" y="12" width="3" height="3" fill="#3f9c5a" />

        <rect x="34" y="29" width="62" height="6" fill="#8a3d6b" />
        <rect x="34" y="31" width="62" height="1" fill="#f08fb5" />
        <rect x="34" y="33" width="62" height="1" fill="#f08fb5" />

        <PixelSprite rows={SLEEPING_CAT} palette={CALICO_PALETTE} x={52} y={22} />
        <g className="motion-safe:animate-pulse" opacity=".85">
          <PixelSprite rows={Z} palette={{ Z: "#fde7c4" }} x={51} y={18} />
          <PixelSprite rows={Z} palette={{ Z: "#fbd08a" }} x={55} y={14} />
        </g>
      </svg>
    </section>
  );
}
