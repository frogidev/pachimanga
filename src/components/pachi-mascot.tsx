export function PachiMascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 220" className={className} role="img" aria-label="Pachi, the calico pixel cat mascot" shapeRendering="crispEdges">
      <g stroke="#17131d" strokeWidth="7" strokeLinejoin="miter">
        <path d="M45 78V42h18V24h20v24c13-7 29-10 45-10 18 0 35 4 48 11V24h20v18h18v39c10 15 15 34 15 55 0 48-39 76-101 76S27 184 27 136c0-22 6-42 18-58Z" fill="#fff0e7"/>
        <path d="M50 75V45h14V31h12v34Z" fill="#f2a1aa" stroke="none"/><path d="M180 65V31h12v14h14v30Z" fill="#f2a1aa" stroke="none"/>
        <path d="M46 84c8-24 24-37 48-42l24 2-6 45-30 14Z" fill="#e58a42" stroke="none"/>
        <path d="M113 44c20-4 42-1 61 8l8 31-27 13-37-7Z" fill="#34303d" stroke="none"/>
        <path d="M169 100c20-12 39-10 55 0 4 12 6 24 5 37l-43 5Z" fill="#d87b3d" stroke="none"/>
        <path d="M41 151c14-8 31-8 47-1l10 48c-22-5-41-15-51-30Z" fill="#37313e" stroke="none"/>
        <rect x="78" y="116" width="12" height="15" fill="#17131d" stroke="none"/><rect x="166" y="116" width="12" height="15" fill="#17131d" stroke="none"/>
        <rect x="118" y="137" width="20" height="11" fill="#ef7798" stroke="none"/>
        <path d="M128 148v9m0 0-14 8m14-8 14 8" fill="none" stroke="#17131d" strokeWidth="5"/>
        <path d="M68 146H31m39 13H36m150-13h39m-39 13h34" fill="none" stroke="#806a77" strokeWidth="4"/>
        <rect x="95" y="176" width="66" height="10" fill="#f05f91" stroke="none"/><rect x="119" y="181" width="18" height="18" fill="#ff9ab9" stroke="none"/>
      </g>
    </svg>
  );
}
