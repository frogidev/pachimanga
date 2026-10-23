"use client";
import { useLocale } from "@/lib/i18n";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">{t("error.reader")}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{t("error.content")}</p>
        <button type="button" onClick={reset} className="mt-5 rounded-xl bg-white/8 px-4 py-2.5 text-sm hover:bg-white/12">{t("common.try_again")}</button>
      </div>
    </div>
  );
}
