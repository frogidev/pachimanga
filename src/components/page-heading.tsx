import type { ReactNode } from "react";

export function PageHeading({
  title,
  subtitle,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  const desc = subtitle || description;
  return (
    <header className="flex flex-col gap-5 border-b border-white/[.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="pixel-kicker mb-2 text-[9px] text-pink-400">{eyebrow}</p> : null}
        <h1 className="text-[2rem] font-bold tracking-[-.045em] text-white sm:text-[2.35rem]">{title}</h1>
        {desc ? <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{desc}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
