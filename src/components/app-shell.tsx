"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PachiLogo } from "@/components/pachi-logo";
import { PachiMascot } from "@/components/pachi-mascot";

const navItems=[
  {href:"/",label:"Library",glyph:"▤"},
  {href:"/browse",label:"Browse",glyph:"⌕"},
  {href:"/updates",label:"Updates",glyph:"◉"},
  {href:"/history",label:"History",glyph:"◷"},
  {href:"/import",label:"Import",glyph:"⇩"},
  {href:"/settings",label:"Settings",glyph:"⚙"},
] as const;
function isActive(pathname:string,href:string){return href==="/"?pathname==="/":pathname.startsWith(href)}
export function AppShell({children}:{children:ReactNode}){
 const pathname=usePathname(); if(pathname.startsWith('/reader/'))return <>{children}</>;
 return <div className="min-h-dvh bg-[#0a0810] text-zinc-100">
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] border-r border-white/[.06] bg-[#0b0910] px-4 py-5 md:block">
   <Link href="/" className="mb-7 block px-1 py-1"><PachiLogo/></Link>
   <nav className="space-y-1" aria-label="Primary navigation">{navItems.map(item=>{const active=isActive(pathname,item.href);return <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active?'bg-pink-400 text-[#24101b] shadow-[0_8px_28px_rgba(255,115,181,.12)]':'text-zinc-400 hover:bg-white/[.04] hover:text-white'}`}><span className={`grid size-6 place-items-center font-mono text-base ${active?'text-[#24101b]':'text-zinc-500 group-hover:text-pink-300'}`} aria-hidden>{item.glyph}</span><span className="font-medium">{item.label}</span>{item.href==='/updates'?<span className="ml-auto size-1.5 rounded-full bg-pink-400"/>:null}</Link>})}</nav>
   <div className="absolute inset-x-3 bottom-4">
    <div className="relative mb-2 h-[112px] overflow-hidden rounded-2xl border border-pink-300/10 bg-gradient-to-b from-[#17111d] to-[#0d0a11]">
      <div className="absolute left-3 top-3 rounded-md border border-pink-300/20 bg-[#1c1320] px-2 py-1 font-mono text-[9px] leading-4 text-pink-200">good manga<br/>better days. ♡</div>
      <PachiMascot className="absolute -bottom-6 right-1 h-[116px] w-[130px]"/>
    </div>
    <div className="rounded-2xl border border-white/[.07] bg-[#11101a] px-3 py-3 text-[11px] leading-5 text-zinc-500"><div className="font-semibold text-zinc-300">Pachimanga</div><div>Local-first · optional sync</div><Link href="/auth" className="text-pink-300 hover:text-pink-200">Account →</Link></div>
   </div>
  </aside>
  <main className="min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:ml-[230px] md:pb-0">{children}</main>
  <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/[.06] bg-[#0b0910]/95 px-1 pt-2 pb-[calc(.55rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden" aria-label="Primary navigation">{navItems.slice(0,5).map(item=>{const active=isActive(pathname,item.href);return <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${active?'text-pink-300':'text-zinc-500'}`}><span className="font-mono text-lg leading-none" aria-hidden>{item.glyph}</span>{item.label}</Link>})}</nav>
 </div>
}
