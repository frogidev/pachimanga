import type { Manga } from "@/types/models";

type Poster = {
  bg: string;
  bg2: string;
  accent: string;
  accent2: string;
  short: string;
  issue: string;
  scene: "sky" | "glass" | "sword" | "moon" | "signal" | "orchid" | "embers" | "stars";
};

const posters: Record<string, Poster> = {
  "ashen-sky": { bg: "#b8d8ff", bg2: "#5f73c6", accent: "#f6d8ff", accent2: "#334a89", short: "ASHEN", issue: "NO. 01", scene: "sky" },
  "glass-horizon": { bg: "#f18d3d", bg2: "#0f9f8f", accent: "#d8ff5f", accent2: "#20352f", short: "GLASS", issue: "FILE 07", scene: "glass" },
  "quiet-swordsman": { bg: "#f6b73e", bg2: "#9e2f32", accent: "#fff0a7", accent2: "#201419", short: "QUIET", issue: "VOL. 12", scene: "sword" },
  "second-moon": { bg: "#ff6f9f", bg2: "#6d275c", accent: "#ffd3e8", accent2: "#1f1425", short: "MOON", issue: "ACT 04", scene: "moon" },
  "signal-zero": { bg: "#193c39", bg2: "#8abd3b", accent: "#e8ff85", accent2: "#0b1d1d", short: "ZERO", issue: "LOG 00", scene: "signal" },
  "winter-orchid": { bg: "#adc7ef", bg2: "#294f89", accent: "#f8edff", accent2: "#162c53", short: "ORCHID", issue: "BOOK 03", scene: "orchid" },
  "city-of-embers": { bg: "#ff7b42", bg2: "#552439", accent: "#ffc86b", accent2: "#25131a", short: "EMBERS", issue: "NIGHT 09", scene: "embers" },
  "paper-stars": { bg: "#b78ee8", bg2: "#54409b", accent: "#ffe390", accent2: "#241b48", short: "STARS", issue: "SIDE A", scene: "stars" },
};

export function MockCoverArt({ manga, className = "" }: { manga: Manga; className?: string }) {
  const p = posters[manga.id] ?? posters["second-moon"];
  const id = manga.id.replace(/[^a-z0-9]/gi, "");
  const words = manga.title.toUpperCase().split(" ");
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");

  return (
    <svg viewBox="0 0 320 480" className={className} role="img" aria-label={`${manga.title} cover artwork`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={p.bg} />
          <stop offset="1" stopColor={p.bg2} />
        </linearGradient>
        <linearGradient id={`shade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".62" />
        </linearGradient>
        <pattern id={`grain-${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="1" fill="#fff" opacity=".025" />
          <rect y="4" width="8" height="1" fill="#000" opacity=".025" />
        </pattern>
      </defs>

      <rect width="320" height="480" fill={`url(#bg-${id})`} />
      <rect x="14" y="14" width="292" height="452" fill="none" stroke="#fff" strokeOpacity=".24" strokeWidth="2" />
      <text x="26" y="39" fill="#fff" fillOpacity=".82" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="800" letterSpacing="3">PACHI COMICS</text>
      <text x="294" y="39" textAnchor="end" fill="#fff" fillOpacity=".72" fontFamily="ui-monospace, monospace" fontSize="9" fontWeight="700">{p.issue}</text>

      {p.scene === "sky" ? (
        <g>
          <circle cx="240" cy="118" r="66" fill="#f8e8ff" opacity=".9" />
          <circle cx="240" cy="118" r="48" fill="#8fa5e1" opacity=".5" />
          <path d="M-20 305 72 202l48 62 48-91 74 104 48-51 55 79v88H-20Z" fill="#334a89" opacity=".86" />
          <path d="M6 315 98 237l40 42 50-66 72 80 44-36 36 49v72H6Z" fill="#d6e7ff" opacity=".88" />
          <path d="M154 279c20-27 43-40 68-40l-21 18 10 5-30 19-27 2Z" fill="#20294a" />
        </g>
      ) : null}

      {p.scene === "glass" ? (
        <g>
          <path d="M0 110 320 35v105L0 215Z" fill="#d6ff5f" opacity=".22" />
          <path d="M-20 190 330 84M-15 238 332 132M-10 286 334 180" stroke="#eaff8a" strokeWidth="6" opacity=".55" />
          <circle cx="198" cy="238" r="84" fill="#102e2b" opacity=".9" />
          <circle cx="198" cy="238" r="58" fill="none" stroke="#d8ff5f" strokeWidth="10" opacity=".72" />
          <path d="m144 292 103-109" stroke="#f9a146" strokeWidth="16" />
        </g>
      ) : null}

      {p.scene === "sword" ? (
        <g>
          <circle cx="158" cy="177" r="92" fill="#ffe06f" opacity=".88" />
          <path d="M158 91v215" stroke="#6c1f27" strokeWidth="8" opacity=".9" />
          <path d="M94 330c17-63 42-101 67-101 27 0 52 40 65 101Z" fill="#24161b" />
          <path d="m104 285 122-129" stroke="#fff1ae" strokeWidth="7" />
          <path d="m114 300 115-121" stroke="#9f3030" strokeWidth="2" />
        </g>
      ) : null}

      {p.scene === "moon" ? (
        <g>
          <circle cx="232" cy="122" r="78" fill="#ffd0e7" opacity=".95" />
          <circle cx="250" cy="105" r="71" fill="#7c336a" opacity=".9" />
          <path d="M95 331c9-76 49-133 97-133 28 0 54 19 71 49-26 4-45 25-49 53-5 31 7 57 24 79H95Z" fill="#211326" />
          <path d="M179 219c29 10 48 31 53 63" fill="none" stroke="#ff9fc6" strokeWidth="7" />
        </g>
      ) : null}

      {p.scene === "signal" ? (
        <g>
          <circle cx="160" cy="225" r="105" fill="none" stroke="#cfff74" strokeWidth="8" opacity=".35" />
          <circle cx="160" cy="225" r="72" fill="none" stroke="#cfff74" strokeWidth="8" opacity=".55" />
          <circle cx="160" cy="225" r="38" fill="#dfff70" opacity=".9" />
          <path d="M160 225 277 139" stroke="#eaff87" strokeWidth="5" />
          <path d="M31 117h85M205 105h71M36 331h109M181 352h101" stroke="#e8ff85" strokeWidth="6" opacity=".45" />
        </g>
      ) : null}

      {p.scene === "orchid" ? (
        <g>
          <circle cx="101" cy="168" r="46" fill="#f5ecff" opacity=".9" />
          <circle cx="136" cy="143" r="38" fill="#d9d9ff" opacity=".9" />
          <circle cx="142" cy="188" r="36" fill="#fff7ff" opacity=".9" />
          <circle cx="101" cy="168" r="12" fill="#d77bba" />
          <path d="M119 184c37 38 55 91 49 158" fill="none" stroke="#244e80" strokeWidth="7" />
          <path d="M167 279c22-29 48-41 78-37-21 11-34 30-39 57" fill="#7fa6d9" opacity=".8" />
          <path d="M0 359 320 299v111L0 449Z" fill="#18355f" opacity=".55" />
        </g>
      ) : null}

      {p.scene === "embers" ? (
        <g>
          <path d="M25 356 73 193l43 71 31-128 51 98 42-74 52 196Z" fill="#291722" opacity=".95" />
          <g fill="#ffdc7f"><circle cx="81" cy="111" r="5"/><circle cx="199" cy="94" r="4"/><circle cx="245" cy="159" r="6"/><circle cx="141" cy="167" r="4"/></g>
        </g>
      ) : null}

      {p.scene === "stars" ? (
        <g>
          <path d="m86 151 8 19 20 2-15 13 5 20-18-10-18 10 5-20-15-13 20-2Zm143 37 7 15 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2Z" fill="#ffe68a" />
          <path d="M36 321c48-70 92-105 132-105 39 0 79 30 118 90-51-21-94-28-128-19-36 8-76 20-122 34Z" fill="#2f235e" opacity=".86" />
        </g>
      ) : null}

      <rect width="320" height="480" fill={`url(#shade-${id})`} />
      <rect width="320" height="480" fill={`url(#grain-${id})`} />

      <g transform="translate(24 348)">
        <rect x="0" y="0" width="5" height="69" fill={p.accent} />
        <text x="16" y="20" fill="#fff" fontFamily="ui-sans-serif, system-ui" fontSize="25" fontWeight="900" letterSpacing=".5">{line1}</text>
        {line2 ? <text x="16" y="48" fill="#fff" fontFamily="ui-sans-serif, system-ui" fontSize="25" fontWeight="900" letterSpacing=".5">{line2}</text> : null}
        <text x="16" y="70" fill="#fff" fillOpacity=".66" fontFamily="ui-monospace, monospace" fontSize="9" fontWeight="700" letterSpacing="2.5">{manga.genres[0]?.toUpperCase() || p.short}</text>
      </g>
    </svg>
  );
}
