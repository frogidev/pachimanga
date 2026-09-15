"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PachiLogo } from "@/components/pachi-logo";
import { PachiMascotImg } from "@/components/pachi-mascot-img";

type NavIconName = "library" | "browse" | "updates" | "history" | "import" | "settings";

const navItems: Array<{ href: string; label: string; icon: NavIconName }> = [
  { href: "/", label: "Library", icon: "library" },
  { href: "/browse", label: "Browse", icon: "browse" },
  { href: "/updates", label: "Updates", icon: "updates" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/import", label: "Import", icon: "import" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: NavIconName }) {
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "library") return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>;
  if (name === "browse") return <svg {...common}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  if (name === "updates") return <svg {...common}><path d="M18 8a6 6 0 1 0 1.1 6.4"/><path d="M18 4v4h-4"/><path d="M12 8v4l2.5 1.5"/></svg>;
  if (name === "history") return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>;
  if (name === "import") return <svg {...common}><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 4.2l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z"/></svg>;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/reader/") || pathname.startsWith("/auth") || pathname === "/offline") return <>{children}</>;

  return (
    <div className="min-h-dvh bg-[#09080d] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-white/[.07] bg-[#0b0910] md:flex md:flex-col">
        <div className="px-5 pb-4 pt-6">
          <Link href="/" className="inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">
            <PachiLogo />
          </Link>
        </div>

        <nav className="mt-2 space-y-1.5 px-4" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex min-h-12 items-center gap-3 rounded-[12px] px-3.5 text-[14px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70 ${
                  active
                    ? "bg-gradient-to-r from-[#ff79b6] to-[#ff92c2] font-semibold text-[#28101b] shadow-[0_8px_28px_rgba(255,108,174,.12)]"
                    : "text-zinc-400 hover:bg-white/[.045] hover:text-zinc-100"
                }`}
              >
                <span className={`grid size-7 place-items-center ${active ? "text-[#28101b]" : "text-zinc-500 group-hover:text-pink-300"}`} aria-hidden="true">
                  <NavIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
                {item.href === "/updates" ? <span className="ml-auto size-2 rounded-full bg-pink-400 shadow-[0_0_12px_rgba(255,111,174,.55)]" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-4 pb-4">
          <div className="sidebar-cozy-scene relative mx-auto mb-1 h-[250px] max-w-[220px]">
            <div className="absolute left-1 top-1 rounded-[8px] border border-pink-300/40 bg-[#1a111c] px-3 py-2 font-mono text-[10px] font-semibold leading-[1.55] text-pink-100 shadow-[4px_4px_0_rgba(83,37,67,.6)]">
              Good manga<br />better days. ♡
              <span className="absolute -bottom-[7px] left-8 h-3 w-3 rotate-45 border-b border-r border-pink-300/40 bg-[#1a111c]" />
            </div>
            <PachiMascotImg width={220} height={147} className="absolute bottom-0 left-[-10px] h-auto w-[220px] rounded-xl object-cover" />
          </div>

          <div className="rounded-[14px] border border-white/[.08] bg-[#111019] px-3.5 py-3 text-[11px] leading-5 text-zinc-500 shadow-[0_14px_40px_rgba(0,0,0,.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-zinc-200">Pachimanga</div>
                <div>Private account · synced</div>
              </div>
              <span className="rounded-md bg-white/[.045] px-1.5 py-0.5 font-mono text-[9px] text-zinc-600">v0.4</span>
            </div>
            <Link href="/auth" className="mt-1 inline-flex text-pink-300 transition hover:text-pink-200">Account →</Link>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 flex h-16 items-center border-b border-white/[.07] bg-[#0b0910]/95 px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="inline-flex"><PachiLogo /></Link>
      </div>

      <main className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:ml-[252px] md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/[.07] bg-[#0b0910]/96 px-1.5 pb-[calc(.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Primary navigation">
        {navItems.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium ${active ? "text-pink-300" : "text-zinc-500"}`}>
              <span aria-hidden="true"><NavIcon name={item.icon} /></span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
