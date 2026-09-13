export function PachiLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="pachi-mark relative grid size-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-[#ff98c8] via-[#ff6eae] to-[#ff4f91] text-[17px] font-black text-[#29121e] shadow-[0_8px_24px_rgba(255,82,145,.18)] ring-1 ring-white/15">
        <span className="absolute -top-[7px] left-[5px] h-[14px] w-[14px] bg-[#ffd4e6] [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
        <span className="absolute -top-[7px] right-[5px] h-[14px] w-[14px] bg-[#ffd4e6] [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
        <span className="relative z-10">P</span>
      </span>
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
