import Image from "next/image";
import { PachiMascotImg } from "@/components/pachi-mascot-img";

export function PixelRoomBanner() {
  return (
    <section className="pixel-room-banner" aria-label="Pachimanga reading room artwork">
      <Image
        src="/ai-art/hero-room.avif"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Decorative SVG overlays (mascots, speech) render above the AI backdrop. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 230"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 3.5h4" stroke="#fff" strokeOpacity=".018" />
          </pattern>
        </defs>
        <rect width="1440" height="230" fill="url(#scan)" />
      </svg>

      <div className="pixel-room-speech hidden sm:block">
        Read more <span aria-hidden="true">♥</span><br />be happier!
      </div>
      <PachiMascotImg eager width={180} height={120} className="pixel-room-cat hidden object-contain lg:block" />
    </section>
  );
}
