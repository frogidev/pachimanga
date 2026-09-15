import Image from "next/image";

export function PachiLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Image
        src="/ai-art/pachi-avatar.avif"
        alt=""
        aria-hidden="true"
        width={44}
        height={44}
        className="size-11 shrink-0 rounded-[15px] object-cover shadow-[0_8px_24px_rgba(255,82,145,.18)] ring-1 ring-white/15"
      />
      {compact ? null : (
        <span className="min-w-0 leading-none">
          <span className="block whitespace-nowrap text-[1.18rem] font-black tracking-[-.045em] text-white">
            Pachi<span className="text-pink-400">manga</span>
          </span>
          <span className="mt-1.5 block whitespace-nowrap text-[8px] font-semibold uppercase tracking-[.22em] text-zinc-500">
            Your manga · everywhere
          </span>
        </span>
      )}
    </span>
  );
}
