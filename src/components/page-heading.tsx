"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n";

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
  // Props may be translation keys (server pages) or already-translated text (t returns unknown keys as-is).
  const { t } = useLocale();
  const desc = subtitle || description;
  return (
    <header className="flex flex-col gap-5 border-b border-white/[.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="pixel-kicker mb-2 text-[9px] text-pink-400">{t(eyebrow)}</p> : null}
        <h1 className="text-[2rem] font-bold tracking-[-.045em] text-white sm:text-[2.35rem]">{t(title)}</h1>
        {desc ? <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{t(desc)}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
