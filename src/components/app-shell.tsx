"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PachiLogo } from "@/components/pachi-logo";
import { PachiMascot } from "@/components/pachi-mascot";

const navItems = [
  { href: "/", label: "Library", glyph: "▤" },
  { href: "/browse", label: "Browse", glyph: "⌕" },
  { href: "/updates", label: "Updates", glyph: "◉" },
  { href: "/history", label: "History", glyph: "◷" },
  { href: "/import", label: "Import", glyph: "⇩" },
  { href: "/settings", label: "Settings", glyph: "⚙" },
] as const;
function isActive(pathname: string, href: string) { return href === "/" ? pathname === "/" : pathname.startsWith(href); }
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/reader/")) return <>{children}</>;
  return <div className="min-h-dvh bg-[#0b0910] text-zinc-100">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[262px] border-r border-pink-100/10 bg-[#0b0910]/96 p-4 backdrop-blur md:block">
      <Link href="/" className="mb-7 flex items-center rounded-xl px-1 py-2"><PachiLogo /></Link>
      <nav className="space-y-1.5" aria-label="Primary navigation">{navItems.map(item => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${active ? "bg-gradient-to-r from-pink-400 to-pink-300 font-semibold text-[#24101b] shadow-[0_6px_24px_rgba(244,114,182,.12)]" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}><span className="w-5 text-center text-lg" aria-hidden>{item.glyph}</span>{item.label}{item.label === "Updates" ? <span className="ml-auto size-2 rounded-full bg-pink-400" /> : null}</Link> })}</nav>
      <div className="absolute inset-x-4 bottom-4">
        <div className="pixel-bubble mb-1 ml-3 w-fit border border-pink-400/50 bg-[#15111b] px-3 py-2 font-mono text-[11px] leading-4 text-pink-200">good manga<br/>better days. ♡</div>
        <PachiMascot className="mx-auto -mb-3 h-32 w-40 drop-shadow-[0_10px_16px_rgba(0,0,0,.45)]" />
        <div className="rounded-xl border border-white/10 bg-[#121019]/95 p-3 text-[11px] text-zinc-500"><div className="font-semibold text-pink-200">Pachimanga</div><div>Local-first · optional sync</div><Link href="/auth" className="mt-1 inline-block text-pink-300">Account →</Link></div>
      </div>
    </aside>
    <main className="min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:ml-[262px] md:pb-0">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-pink-100/10 bg-[#0b0910]/95 px-1 pt-2 pb-[calc(.55rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden" aria-label="Primary navigation">{navItems.slice(0, 5).map(item => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${active ? "text-pink-300" : "text-zinc-500"}`}><span className="text-lg leading-none" aria-hidden>{item.glyph}</span>{item.label}</Link> })}</nav>
  </div>;
}
