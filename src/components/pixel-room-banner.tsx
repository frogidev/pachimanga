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
    </section>
  );
}
