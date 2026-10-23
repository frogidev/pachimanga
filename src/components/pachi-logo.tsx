"use client";

import { PachiCalico } from "@/components/pachi-calico";
import { useLocale } from "@/lib/i18n";

export function PachiLogo({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <span className="inline-flex items-center gap-3">
      <PachiCalico
        className="size-11 shrink-0 rounded-[15px] bg-[#101018] object-cover p-1 shadow-[0_8px_24px_rgba(255,82,145,.18)] ring-1 ring-white/15"
      />
      {compact ? null : (
        <span className="min-w-0 leading-none">
          <span className="block whitespace-nowrap text-[1.18rem] font-black tracking-[-.045em] text-white">
            Pachi<span className="text-pink-400">manga</span>
          </span>
          <span className="mt-1.5 block whitespace-nowrap text-[8px] font-semibold uppercase tracking-[.22em] text-zinc-500">
            {t("brand.tagline")}
          </span>
        </span>
      )}
    </span>
  );
}
