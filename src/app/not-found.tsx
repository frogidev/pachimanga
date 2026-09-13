import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="text-center">
        <p className="text-sm font-medium text-emerald-400">404</p>
        <h1 className="mt-2 text-2xl font-semibold">That page is unavailable</h1>
        <p className="mt-2 text-sm text-zinc-500">The title or chapter may have moved or no longer exists.</p>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-white/8 px-4 py-2.5 text-sm hover:bg-white/12">Back to library</Link>
      </div>
    </div>
  );
}
