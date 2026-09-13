export function PachiLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="pixel-logo relative grid size-10 place-items-center bg-gradient-to-br from-pink-300 via-pink-400 to-rose-500 text-base font-black text-[#2a1020] shadow-[0_0_24px_rgba(244,114,182,.18)]">
        <span className="absolute -top-1.5 left-1 size-3 bg-pink-200 [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
        <span className="absolute -top-1.5 right-1 size-3 bg-orange-200 [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
        P
      </span>
      {compact ? null : (
        <span className="leading-none">
          <span className="block text-[1.18rem] font-black tracking-[-.045em] text-white">
            Pachi<span className="text-pink-400">manga</span>
          </span>
          <span className="mt-1 hidden text-[9px] uppercase tracking-[.22em] text-zinc-500 xl:block">
            your manga · everywhere
          </span>
        </span>
      )}
    </span>
  );
}
