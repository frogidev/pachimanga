"use client";

import { useLocale } from "@/lib/i18n";

export function AuthIntro() {
  const { t } = useLocale();
  return (
    <section className="auth-intro-card rounded-3xl border border-pink-300/12 bg-gradient-to-br from-pink-400/[.08] via-[#111019] to-[#0d0c12] p-6 sm:p-8">
      <p className="pixel-kicker text-[9px] text-pink-400">{t("authpage.kicker")}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-.045em] text-white sm:text-4xl">{t("authpage.title")}</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">{t("authpage.intro")}</p>
      <div className="auth-intro-note mt-7 rounded-2xl border border-white/[.07] bg-black/15 p-4">
        <div>
          <h2 className="font-semibold text-zinc-200">{t("authpage.no_guest")}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{t("authpage.no_guest_sub")}</p>
        </div>
      </div>
    </section>
  );
}
