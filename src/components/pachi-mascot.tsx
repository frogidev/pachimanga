export function PachiMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Pachi, the calico cat mascot"
      shapeRendering="crispEdges"
    >
      {/* ears */}
      <rect x="20" y="12" width="22" height="26" fill="#241c2b" />
      <rect x="78" y="12" width="22" height="26" fill="#241c2b" />
      <rect x="26" y="20" width="10" height="14" fill="#f7b1c8" />
      <rect x="84" y="20" width="10" height="14" fill="#f7b1c8" />
      {/* left ear + head patch: orange */}
      <rect x="20" y="12" width="22" height="12" fill="#e8933c" />
      <rect x="78" y="12" width="22" height="12" fill="#35313c" />

      {/* head base */}
      <rect x="14" y="36" width="92" height="54" fill="#241c2b" />
      <rect x="20" y="30" width="80" height="66" fill="#241c2b" />
      <rect x="28" y="26" width="64" height="74" fill="#241c2b" />

      {/* cream face */}
      <rect x="20" y="40" width="80" height="46" fill="#fff1e0" />
      <rect x="26" y="34" width="68" height="58" fill="#fff1e0" />
      <rect x="32" y="30" width="56" height="66" fill="#fff1e0" />

      {/* orange left cheek patch */}
      <rect x="20" y="40" width="26" height="34" fill="#e8933c" />
      <rect x="26" y="34" width="22" height="22" fill="#e8933c" />
      <rect x="32" y="30" width="14" height="16" fill="#e8933c" />

      {/* dark top-right patch */}
      <rect x="74" y="30" width="22" height="20" fill="#35313c" />
      <rect x="80" y="34" width="20" height="18" fill="#35313c" />
      <rect x="86" y="40" width="14" height="14" fill="#35313c" />

      {/* eyes */}
      <rect x="42" y="60" width="7" height="11" fill="#241c2b" />
      <rect x="71" y="60" width="7" height="11" fill="#241c2b" />
      <rect x="42" y="60" width="7" height="3" fill="#fff1e0" opacity=".25" />

      {/* nose + mouth */}
      <rect x="56" y="72" width="8" height="6" fill="#f2739e" />
      <rect x="53" y="78" width="6" height="3" fill="#241c2b" />
      <rect x="61" y="78" width="6" height="3" fill="#241c2b" />
      <rect x="59" y="78" width="2" height="5" fill="#241c2b" />

      {/* whiskers */}
      <rect x="12" y="68" width="16" height="3" fill="#b98a94" />
      <rect x="10" y="77" width="18" height="3" fill="#b98a94" />
      <rect x="92" y="68" width="16" height="3" fill="#b98a94" />
      <rect x="92" y="77" width="18" height="3" fill="#b98a94" />
    </svg>
  );
}

export function PachiSleeper({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 210 132"
      className={className}
      role="img"
      aria-label="Pachi the calico cat sleeping on a manga box in 8-bit style"
      shapeRendering="crispEdges"
    >
      {/* manga box */}
      <rect x="10" y="86" width="180" height="38" fill="#241c2b" />
      <rect x="16" y="92" width="168" height="26" fill="#6e3f43" />
      <rect x="16" y="86" width="168" height="8" fill="#9b554f" />
      <rect x="30" y="99" width="44" height="4" fill="#b86b5e" opacity=".5" />
      <rect x="128" y="103" width="28" height="4" fill="#b86b5e" opacity=".4" />
      <rect x="104" y="86" width="8" height="32" fill="#45272f" />

      {/* striped tail draped off the left, touching the body */}
      <rect x="26" y="64" width="20" height="36" fill="#241c2b" />
      <rect x="29" y="67" width="14" height="30" fill="#e8933c" />
      <rect x="29" y="74" width="14" height="4" fill="#35313c" />
      <rect x="29" y="84" width="14" height="4" fill="#35313c" />

      {/* loaf body */}
      <rect x="40" y="54" width="108" height="34" fill="#241c2b" />
      <rect x="48" y="48" width="94" height="40" fill="#241c2b" />
      <rect x="46" y="60" width="98" height="22" fill="#fff1e0" />
      <rect x="54" y="54" width="84" height="28" fill="#fff1e0" />

      {/* dark saddle with stepped top and orange rim */}
      <rect x="76" y="38" width="38" height="7" fill="#35313c" />
      <rect x="66" y="44" width="58" height="22" fill="#35313c" />
      <rect x="66" y="66" width="58" height="5" fill="#e8933c" />

      {/* head */}
      <rect x="136" y="38" width="48" height="46" fill="#241c2b" />
      <rect x="142" y="32" width="38" height="52" fill="#241c2b" />
      <rect x="140" y="26" width="13" height="15" fill="#241c2b" />
      <rect x="167" y="26" width="13" height="15" fill="#241c2b" />
      <rect x="143" y="30" width="7" height="9" fill="#f7b1c8" />
      <rect x="170" y="30" width="7" height="9" fill="#f7b1c8" />

      {/* orange head with cream muzzle */}
      <rect x="142" y="43" width="36" height="36" fill="#e8933c" />
      <rect x="147" y="37" width="28" height="42" fill="#e8933c" />
      <rect x="146" y="60" width="30" height="19" fill="#fff1e0" />
      <rect x="150" y="64" width="22" height="15" fill="#fff1e0" />

      {/* sleepy closed eyes + nose */}
      <rect x="149" y="58" width="10" height="3" fill="#241c2b" />
      <rect x="164" y="58" width="10" height="3" fill="#241c2b" />
      <rect x="159" y="66" width="7" height="5" fill="#f2739e" />
      <rect x="162" y="71" width="3" height="4" fill="#241c2b" />

      {/* paws draped over the box edge */}
      <rect x="144" y="80" width="14" height="16" fill="#241c2b" />
      <rect x="147" y="80" width="11" height="13" fill="#fff1e0" />
      <rect x="163" y="80" width="14" height="16" fill="#241c2b" />
      <rect x="163" y="80" width="11" height="13" fill="#fff1e0" />

      {/* sleep z's */}
      <g fill="#ff82bb" fontFamily="ui-monospace, SFMono-Regular, monospace" fontWeight="900">
        <text x="188" y="52" fontSize="12">Z</text>
        <text x="197" y="38" fontSize="9">Z</text>
      </g>
    </svg>
  );
}
