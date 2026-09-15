"use client";

import Link from "next/link";

export default function ReaderError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-black px-6 text-center text-white">
      <div className="max-w-sm">
        <p className="pixel-heading text-xl text-white">This chapter failed to load</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Check your connection and try again. Your saved progress is kept.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-pink-400 px-5 py-2.5 text-sm font-bold text-[#28101b] transition hover:brightness-105"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/[.05] px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[.09]"
          >
            Back to library
          </Link>
        </div>
      </div>
    </div>
  );
}
