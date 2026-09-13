"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PachiLogo } from "@/components/pachi-logo";

const navItems=[
  {href:"/",label:"Library",glyph:"▦"},
  {href:"/updates",label:"Updates",glyph:"✦"},
  {href:"/browse",label:"Browse",glyph:"⌕"},
  {href:"/history",label:"History",glyph:"↺"},
  {href:"/import",label:"Import",glyph:"⇧"},
  {href:"/settings",label:"Settings",glyph:"⚙"},
] as const;
function isActive(pathname:string,href:string){return href==="/"?pathname==="/":pathname.startsWith(href)}
export function AppShell({children}:{children:ReactNode}){
 const pathname=usePathname(); if(pathname.startsWith('/reader/'))return <>{children}</>;
 return <div className="min-h-dvh bg-[#0d0a11] text-zinc-100">
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-pink-100/8 bg-[#0d0a11]/95 p-4 backdrop-blur md:block">
   <Link href="/" className="mb-8 flex items-center rounded-2xl px-2 py-2"><PachiLogo/></Link>
   <nav className="space-y-1" aria-label="Primary navigation">{navItems.map(item=>{const active=isActive(pathname,item.href);return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active?'bg-pink-400/12 font-medium text-pink-200':'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}><span className="w-5 text-center text-lg" aria-hidden>{item.glyph}</span>{item.label}</Link>})}</nav>
   <div className="absolute inset-x-4 bottom-5 rounded-2xl border border-pink-100/8 bg-gradient-to-br from-pink-400/8 to-fuchsia-400/5 p-3 text-xs leading-5 text-zinc-500"><div className="font-semibold text-pink-200">Your manga. Everywhere.</div><div>Local-first · optional sync</div><Link href="/auth" className="mt-2 inline-block text-pink-300 hover:text-pink-200">Account →</Link></div>
  </aside>
  <main className="min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:ml-60 md:pb-0">{children}</main>
  <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-pink-100/8 bg-[#0d0a11]/94 px-1 pt-2 pb-[calc(.55rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden" aria-label="Primary navigation">{navItems.slice(0,5).map(item=>{const active=isActive(pathname,item.href);return <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${active?'text-pink-300':'text-zinc-500'}`}><span className="text-lg leading-none" aria-hidden>{item.glyph}</span>{item.label}</Link>})}</nav>
 </div>
}
