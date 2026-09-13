export function PachiMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Pachi, the 8-bit calico cat mascot"
      shapeRendering="crispEdges"
    >
      {/* ears / silhouette */}
      <rect x="24" y="18" width="18" height="18" fill="#2a222d" />
      <rect x="30" y="12" width="12" height="12" fill="#2a222d" />
      <rect x="78" y="18" width="18" height="18" fill="#2a222d" />
      <rect x="78" y="12" width="12" height="12" fill="#2a222d" />
      <rect x="30" y="18" width="8" height="10" fill="#f3a2bf" />
      <rect x="82" y="18" width="8" height="10" fill="#f3a2bf" />

      {/* blocky head outline */}
      <rect x="18" y="36" width="84" height="48" fill="#2a222d" />
      <rect x="24" y="30" width="72" height="60" fill="#2a222d" />
      <rect x="30" y="26" width="60" height="68" fill="#2a222d" />

      {/* cream face */}
      <rect x="24" y="40" width="72" height="40" fill="#fff4e9" />
      <rect x="30" y="34" width="60" height="52" fill="#fff4e9" />
      <rect x="36" y="30" width="48" height="60" fill="#fff4e9" />

      {/* calico patches */}
      <rect x="24" y="40" width="18" height="18" fill="#d77c38" />
      <rect x="30" y="34" width="18" height="18" fill="#d77c38" />
      <rect x="36" y="30" width="12" height="12" fill="#d77c38" />
      <rect x="48" y="30" width="24" height="18" fill="#34313b" />
      <rect x="54" y="36" width="24" height="18" fill="#34313b" />
      <rect x="78" y="40" width="18" height="18" fill="#d77c38" />
      <rect x="72" y="46" width="24" height="18" fill="#d77c38" />

      {/* eyes */}
      <rect x="42" y="58" width="6" height="9" fill="#231d27" />
      <rect x="72" y="58" width="6" height="9" fill="#231d27" />

      {/* muzzle / nose */}
      <rect x="54" y="66" width="12" height="6" fill="#ef78a8" />
      <rect x="57" y="72" width="6" height="6" fill="#231d27" />
      <rect x="51" y="78" width="9" height="3" fill="#231d27" />
      <rect x="60" y="78" width="9" height="3" fill="#231d27" />

      {/* whiskers */}
      <rect x="18" y="68" width="18" height="3" fill="#806b78" />
      <rect x="15" y="76" width="21" height="3" fill="#806b78" />
      <rect x="84" y="68" width="18" height="3" fill="#806b78" />
      <rect x="84" y="76" width="21" height="3" fill="#806b78" />

      {/* chest / collar */}
      <rect x="36" y="88" width="48" height="12" fill="#2a222d" />
      <rect x="42" y="88" width="36" height="18" fill="#fff4e9" />
      <rect x="54" y="88" width="12" height="6" fill="#ff6fae" />
      <rect x="48" y="100" width="24" height="6" fill="#ead7cc" />
    </svg>
  );
}

export function PachiSleeper({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 126"
      className={className}
      role="img"
      aria-label="Pachi sleeping on a manga box in 8-bit style"
      shapeRendering="crispEdges"
    >
      {/* cardboard box */}
      <rect x="12" y="84" width="156" height="34" fill="#2a1c25" />
      <rect x="18" y="90" width="144" height="28" fill="#6e3941" />
      <rect x="18" y="84" width="144" height="8" fill="#9b554f" />
      <rect x="30" y="96" width="42" height="4" fill="#b86b5e" opacity=".5" />
      <rect x="118" y="100" width="26" height="4" fill="#b86b5e" opacity=".4" />
      <rect x="132" y="90" width="4" height="28" fill="#45272f" />

      {/* long body outline */}
      <rect x="34" y="52" width="88" height="32" fill="#2a222d" />
      <rect x="42" y="44" width="70" height="40" fill="#2a222d" />
      <rect x="52" y="40" width="52" height="42" fill="#2a222d" />

      {/* cream body */}
      <rect x="40" y="58" width="78" height="20" fill="#fff4e9" />
      <rect x="48" y="50" width="62" height="28" fill="#fff4e9" />
      <rect x="58" y="46" width="44" height="28" fill="#fff4e9" />

      {/* calico back patches */}
      <rect x="40" y="54" width="20" height="20" fill="#d77c38" />
      <rect x="48" y="48" width="20" height="18" fill="#d77c38" />
      <rect x="64" y="46" width="26" height="20" fill="#36323c" />
      <rect x="78" y="52" width="26" height="18" fill="#36323c" />

      {/* head outline and ears */}
      <rect x="102" y="46" width="44" height="34" fill="#2a222d" />
      <rect x="108" y="40" width="34" height="42" fill="#2a222d" />
      <rect x="108" y="34" width="10" height="12" fill="#2a222d" />
      <rect x="132" y="34" width="10" height="12" fill="#2a222d" />
      <rect x="110" y="38" width="6" height="8" fill="#f4a2bf" />
      <rect x="134" y="38" width="6" height="8" fill="#f4a2bf" />

      {/* head cream */}
      <rect x="108" y="50" width="34" height="26" fill="#fff4e9" />
      <rect x="114" y="44" width="22" height="34" fill="#fff4e9" />

      {/* head patches */}
      <rect x="108" y="48" width="12" height="14" fill="#d77c38" />
      <rect x="114" y="44" width="10" height="12" fill="#d77c38" />
      <rect x="126" y="44" width="10" height="12" fill="#36323c" />
      <rect x="136" y="50" width="6" height="14" fill="#d77c38" />

      {/* sleepy eyes */}
      <rect x="114" y="62" width="8" height="3" fill="#231d27" />
      <rect x="130" y="62" width="8" height="3" fill="#231d27" />
      <rect x="123" y="68" width="7" height="4" fill="#ef78a8" />
      <rect x="126" y="72" width="3" height="4" fill="#231d27" />

      {/* paws */}
      <rect x="108" y="76" width="14" height="12" fill="#2a222d" />
      <rect x="112" y="76" width="14" height="8" fill="#fff4e9" />
      <rect x="136" y="76" width="14" height="12" fill="#2a222d" />
      <rect x="132" y="76" width="14" height="8" fill="#fff4e9" />

      {/* dangling tail */}
      <rect x="28" y="68" width="18" height="14" fill="#2a222d" />
      <rect x="22" y="76" width="18" height="20" fill="#2a222d" />
      <rect x="24" y="78" width="10" height="12" fill="#36323c" />
      <rect x="28" y="68" width="10" height="10" fill="#d77c38" />

      {/* sleep z's */}
      <g fill="#ff82bb" fontFamily="ui-monospace, SFMono-Regular, monospace" fontWeight="900">
        <text x="150" y="48" fontSize="11">Z</text>
        <text x="160" y="36" fontSize="8">Z</text>
      </g>
    </svg>
  );
}
