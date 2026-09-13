import { PachiMascot, PachiSleeper } from "@/components/pachi-mascot";

export function PixelRoomBanner() {
  return (
    <section className="pixel-room-banner" aria-label="Pachimanga reading room artwork">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 230"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#2d1a49" />
            <stop offset=".42" stopColor="#4d245b" />
            <stop offset="1" stopColor="#17111f" />
          </linearGradient>
          <linearGradient id="window" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#542659" stopOpacity=".36" />
            <stop offset="1" stopColor="#13111b" stopOpacity=".05" />
          </linearGradient>
          <radialGradient id="moonGlow">
            <stop stopColor="#ffd99c" stopOpacity=".44" />
            <stop offset="1" stopColor="#ffd99c" stopOpacity="0" />
          </radialGradient>
          <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 3.5h4" stroke="#fff" strokeOpacity=".018" />
          </pattern>
        </defs>

        <rect width="1440" height="230" fill="url(#night)" />
        <circle cx="790" cy="43" r="58" fill="url(#moonGlow)" />
        <path d="M786 21c-18 7-25 29-14 43 9 12 24 13 36 6-9 15-30 20-45 8-18-14-18-42 1-56 7-5 15-7 22-7Z" fill="#ffd496" />

        <g fill="#ffd4ef" opacity=".95">
          <rect x="447" y="35" width="4" height="4" />
          <rect x="508" y="18" width="3" height="3" />
          <rect x="602" y="56" width="4" height="4" />
          <rect x="706" y="24" width="3" height="3" />
          <rect x="847" y="35" width="3" height="3" />
          <rect x="936" y="18" width="4" height="4" />
          <rect x="1095" y="38" width="3" height="3" />
          <rect x="1260" y="23" width="4" height="4" />
          <path d="m872 17 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#ffafcd" />
        </g>

        <rect x="295" y="0" width="2" height="170" fill="#16101d" opacity=".7" />
        <rect x="554" y="0" width="2" height="170" fill="#16101d" opacity=".7" />
        <rect x="885" y="0" width="2" height="170" fill="#16101d" opacity=".7" />
        <rect x="1165" y="0" width="2" height="170" fill="#16101d" opacity=".7" />

        <g opacity=".95">
          <path d="M300 143V105h24V88h20v55h18V75h25v68h22V97h29v46h19v-31h24v31h24v-61h28v61h29v-44h24v44h24v-69h32v69h20v-36h28v36h25v-52h28v52h25v-29h24v29h25v-68h29v68h27v-44h25v44h29v-59h32v59h25v-35h25v35h23v-47h28v47h38v46H300Z" fill="#17172b" />
          <g fill="#ffb767" opacity=".72">
            <rect x="341" y="104" width="4" height="5" /><rect x="376" y="91" width="4" height="5" />
            <rect x="433" y="116" width="4" height="5" /><rect x="493" y="99" width="4" height="5" />
            <rect x="530" y="114" width="4" height="5" /><rect x="594" y="93" width="4" height="5" />
            <rect x="627" y="111" width="4" height="5" /><rect x="689" y="85" width="4" height="5" />
            <rect x="726" y="117" width="4" height="5" /><rect x="782" y="99" width="4" height="5" />
            <rect x="826" y="112" width="4" height="5" /><rect x="921" y="89" width="4" height="5" />
            <rect x="974" y="112" width="4" height="5" /><rect x="1034" y="99" width="4" height="5" />
            <rect x="1092" y="114" width="4" height="5" />
          </g>
        </g>

        <g opacity=".9">
          <circle cx="350" cy="130" r="29" fill="#692d69" />
          <circle cx="321" cy="137" r="18" fill="#813b79" />
          <circle cx="376" cy="141" r="22" fill="#713267" />
          <circle cx="1055" cy="133" r="23" fill="#77386d" />
          <circle cx="1080" cy="140" r="18" fill="#8d447a" />
          <circle cx="1112" cy="134" r="26" fill="#6e3166" />
          <g fill="#ff8eb7">
            <rect x="330" y="116" width="5" height="5" /><rect x="360" y="126" width="4" height="4" />
            <rect x="1084" y="121" width="5" height="5" /><rect x="1120" y="127" width="4" height="4" />
          </g>
        </g>

        <g>
          <rect x="41" y="12" width="88" height="116" fill="#2f1730" stroke="#74395e" strokeWidth="4" />
          <rect x="49" y="20" width="72" height="100" fill="#b75b69" opacity=".38" />
          <rect x="61" y="39" width="47" height="64" fill="#2d1828" opacity=".55" />
          <rect x="80" y="31" width="8" height="8" fill="#ff9ebf" />
        </g>

        <g>
          <rect x="1012" y="17" width="150" height="108" rx="3" fill="#713d61" stroke="#211424" strokeWidth="5" />
          <rect x="1023" y="28" width="128" height="86" fill="#b46c88" opacity=".38" />
          <text x="1087" y="52" textAnchor="middle" fill="#16101d" fontSize="14" fontWeight="900" fontFamily="ui-monospace, monospace">MANGA</text>
          <text x="1087" y="72" textAnchor="middle" fill="#16101d" fontSize="14" fontWeight="900" fontFamily="ui-monospace, monospace">FUELS</text>
          <text x="1087" y="92" textAnchor="middle" fill="#16101d" fontSize="14" fontWeight="900" fontFamily="ui-monospace, monospace">HAPPINESS</text>
        </g>
        <g>
          <rect x="1177" y="17" width="154" height="108" rx="3" fill="#2d1d43" stroke="#211424" strokeWidth="5" />
          <text x="1254" y="48" textAnchor="middle" fill="#ff75b0" fontSize="13" fontWeight="900" fontFamily="ui-monospace, monospace">GOOD STORIES</text>
          <text x="1254" y="70" textAnchor="middle" fill="#ff75b0" fontSize="13" fontWeight="900" fontFamily="ui-monospace, monospace">BRIGHTER DAYS</text>
          <text x="1254" y="95" textAnchor="middle" fill="#ff75b0" fontSize="18">♥</text>
        </g>

        <g>
          <rect x="1290" y="114" width="150" height="14" fill="#4c2a37" />
          <rect x="1299" y="127" width="10" height="50" fill="#7c384c" />
          <rect x="1313" y="127" width="13" height="50" fill="#4d3159" />
          <rect x="1330" y="127" width="9" height="50" fill="#a45a49" />
          <rect x="1343" y="127" width="15" height="50" fill="#6a3f69" />
          <rect x="1362" y="127" width="12" height="50" fill="#a45a49" />
          <rect x="1378" y="127" width="14" height="50" fill="#4b315d" />
          <rect x="1396" y="127" width="11" height="50" fill="#8e465a" />
        </g>

        <g>
          <rect x="920" y="147" width="520" height="20" fill="#2a1825" />
          <rect x="0" y="162" width="1440" height="68" fill="#151018" />
          <rect x="0" y="162" width="1440" height="7" fill="#69314e" />
          <rect x="0" y="169" width="1440" height="3" fill="#2a1825" />
        </g>
        <rect width="1440" height="230" fill="url(#scan)" />
      </svg>

      <div className="pixel-room-speech hidden sm:block">
        Read more <span aria-hidden="true">♥</span><br />be happier!
      </div>
      <PachiSleeper className="pixel-room-sleeper hidden sm:block" />
      <PachiMascot className="pixel-room-cat hidden lg:block" />
    </section>
  );
}
