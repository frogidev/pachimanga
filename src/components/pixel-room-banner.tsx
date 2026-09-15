import Image from "next/image";
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
    <Image
      src="/ai-art/scanlines.avif"
      alt="Scanline overlay"
      aria-hidden="true"
      fill
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      priority
      sizes="100vw"
    />

      <div className="pixel-room-speech hidden sm:block">
        Read more <span aria-hidden="true">♥</span><br />be happier!
      </div>
    </section>
  );
}
