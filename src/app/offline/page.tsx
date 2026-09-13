import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-950 px-6 text-zinc-100">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-white/5 text-2xl">F</div>
        <h1 className="mt-5 text-2xl font-semibold">You are offline</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Previously cached screens and local reading progress remain available. Reconnect to fetch new content.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950">Open library</Link>
      </div>
    </main>
  );
}
