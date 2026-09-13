export function PachiMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      role="img"
      aria-label="Pachi, the calico cat mascot"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id="pachi-cream" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff8ef" />
          <stop offset="1" stopColor="#f7e5d9" />
        </linearGradient>
        <filter id="pachi-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#07050a" floodOpacity=".45" />
        </filter>
      </defs>
      <g filter="url(#pachi-shadow)">
        <path d="M58 72 52 33 82 58M162 72l6-39-31 26" fill="url(#pachi-cream)" stroke="#2b2230" strokeWidth="6" strokeLinejoin="round" />
        <path d="m60 55-3-15 13 15m90 0 3-15-14 16" fill="#f7a7c5" />
        <path d="M48 91c0-38 27-60 62-60s62 22 62 60v34c0 36-25 59-62 59s-62-23-62-59z" fill="url(#pachi-cream)" stroke="#2b2230" strokeWidth="6" />
        <path d="M51 81c6-27 24-42 50-48l-6 44-44 17Z" fill="#d77d3d" />
        <path d="M95 35c23-8 43-1 57 12l-5 39-48-9Z" fill="#38333f" />
        <path d="M145 82c9-13 18-19 29-20l2 38-39 7Z" fill="#d77d3d" />
        <ellipse cx="83" cy="112" rx="5" ry="8" fill="#28212c" />
        <ellipse cx="139" cy="112" rx="5" ry="8" fill="#28212c" />
        <path d="M101 128h18l-9 8Z" fill="#ef75a6" />
        <path d="M110 136v8m0 0-10 7m10-7 10 7" fill="none" stroke="#2b2230" strokeWidth="4" strokeLinecap="round" />
        <path d="M72 135H42m31 10H47m101-10h31m-32 10h27" stroke="#836a78" strokeWidth="3" strokeLinecap="round" />
        <path d="M65 166c10 24 27 35 45 35s37-11 47-35" fill="url(#pachi-cream)" stroke="#2b2230" strokeWidth="6" strokeLinejoin="round" />
        <path d="M72 181c8 9 21 14 38 14 17 0 29-5 37-14" fill="none" stroke="#ead7cb" strokeWidth="3" />
        <rect x="99" y="169" width="22" height="10" rx="4" fill="#ff6fae" />
      </g>
    </svg>
  );
}

export function PachiSleeper({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 220"
      className={className}
      role="img"
      aria-label="Pachi sleeping on a manga box"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id="box" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8b4a4a" />
          <stop offset="1" stopColor="#5b3037" />
        </linearGradient>
        <filter id="sleep-shadow" x="-30%" y="-40%" width="170%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#030205" floodOpacity=".45" />
        </filter>
      </defs>
      <g filter="url(#sleep-shadow)">
        <path d="M27 151h236v51H27z" fill="url(#box)" stroke="#2a1a23" strokeWidth="5" />
        <path d="M27 151 53 136h230l-20 15Z" fill="#a05a53" stroke="#2a1a23" strokeWidth="5" />
        <path d="M196 136 223 151v51" fill="none" stroke="#43252d" strokeWidth="4" />
        <path d="M55 173h57m91-8h31" stroke="#c17865" strokeWidth="3" opacity=".45" />
        <path d="M71 133c7-41 42-67 89-67 39 0 67 17 79 49 6 15-5 29-23 29H92c-16 0-24-5-21-11Z" fill="#fff6ec" stroke="#2b2230" strokeWidth="6" />
        <path d="M74 122c5-35 28-53 56-56l3 45-47 20Z" fill="#d77d3d" />
        <path d="M130 66c21-6 42-3 59 6l-7 42-49-3Z" fill="#393440" />
        <path d="M179 83c20-5 40 5 51 24l-31 22-24-19Z" fill="#d77d3d" />
        <path d="M194 87 206 61l15 31" fill="#fff6ec" stroke="#2b2230" strokeWidth="6" strokeLinejoin="round" />
        <path d="M92 84 100 62l16 20" fill="#fff6ec" stroke="#2b2230" strokeWidth="6" strokeLinejoin="round" />
        <path d="M98 102c7 4 14 4 21 0m52 0c7 4 14 4 21 0" fill="none" stroke="#2b2230" strokeWidth="4" strokeLinecap="round" />
        <path d="M139 112h15l-7 7Z" fill="#ef75a6" />
        <path d="M147 119v7m0 0-9 6m9-6 9 6" fill="none" stroke="#2b2230" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M91 126H58m35 8H63m111-8h34m-35 8h30" stroke="#806875" strokeWidth="3" strokeLinecap="round" />
        <path d="M86 133c-18 6-25 20-19 39 14 10 27 5 38-9" fill="#34303a" stroke="#2b2230" strokeWidth="5" />
        <path d="M218 131c17-3 31 1 38 14-9 12-22 18-41 12" fill="#fff6ec" stroke="#2b2230" strokeWidth="5" />
        <path d="M226 136c16-3 25 2 31 10-7 8-15 11-27 10" fill="#d77d3d" />
      </g>
      <g fill="#ff8fc1" fontFamily="ui-monospace, SFMono-Regular, monospace" fontWeight="700">
        <text x="246" y="70" fontSize="17">z</text>
        <text x="265" y="48" fontSize="13">z</text>
      </g>
    </svg>
  );
}
