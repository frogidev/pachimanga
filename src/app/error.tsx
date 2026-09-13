"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Reader error</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">The requested content could not be loaded. Your local library and reading progress were not cleared.</p>
        <button type="button" onClick={reset} className="mt-5 rounded-xl bg-white/8 px-4 py-2.5 text-sm hover:bg-white/12">Try again</button>
      </div>
    </div>
  );
}
