import Image from "next/image";
import Link from "next/link";
import type { Manga } from "@/types/models";

const palette:Record<string,[string,string,string]>={
  "ashen-sky":["#5546a8","#2b1d52","#bc8cff"],
  "glass-horizon":["#087f8c","#0b3940","#58d8df"],
  "quiet-swordsman":["#9a6a17","#4a3211","#ffd36f"],
  "second-moon":["#9a3557","#4e1f35","#ff8fb8"],
  "signal-zero":["#4f7a20","#263d18","#b9ee71"],
  "winter-orchid":["#2f588f","#172d4b","#8fbaff"],
};
const progressById:Record<string,number>={"ashen-sky":66,"glass-horizon":42,"quiet-swordsman":81,"second-moon":37,"signal-zero":58,"winter-orchid":73};

function MockPoster({manga}:{manga:Manga}){
 const [a,b,c]=palette[manga.id]||["#6d365c","#301927","#ff8fc3"];
 const initials=manga.title.split(/\s+/).slice(0,2).map(x=>x[0]).join("");
 return <div className="pixel-cover absolute inset-0" style={{background:`linear-gradient(155deg,${a},${b} 62%,#0b0910)`}}>
   <div className="absolute -right-6 top-9 h-24 w-36 rotate-[-16deg] border-t-2" style={{borderColor:c,boxShadow:`0 -10px 25px ${c}33`}}/>
   <div className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[.22em] text-white/65">PACHI FILE</div>
   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-5xl font-black tracking-[-.08em] text-white/90" style={{textShadow:`4px 4px 0 ${b}`}}>{initials}</div>
   <div className="absolute inset-x-4 bottom-5 border-l-2 pl-2" style={{borderColor:c}}><div className="text-[11px] font-black uppercase leading-tight text-white">{manga.title}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-[.15em] text-white/55">{manga.genres[0]}</div></div>
 </div>
}

export function MangaCard({ manga, progress }: { manga: Manga; progress?: number }) {
 const pct=typeof progress==="number"?Math.min(100,progress):(progressById[manga.id]??44);
 const mock=manga.sourceId==="mock";
 return <Link href={`/manga/${manga.id}`} className="group min-w-0">
   <article className="rounded-2xl border border-white/[.07] bg-[#11101a] p-2 transition duration-200 hover:-translate-y-1 hover:border-pink-300/25 hover:bg-[#15121d]">
    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#17151d] ring-1 ring-white/[.05]">
      {mock?<MockPoster manga={manga}/>:<Image src={manga.coverUrl} alt={`${manga.title} cover`} fill sizes="(max-width:640px)45vw,(max-width:1024px)23vw,14vw" className="object-cover transition duration-300 group-hover:scale-[1.025]" unoptimized/>}
      <div className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-md bg-black/65 text-sm text-white/70">⋮</div>
      <div className="absolute bottom-2 left-2 z-10 rounded-md border border-sky-300/25 bg-[#07131b]/85 px-2 py-1 text-[9px] font-medium text-sky-300">● Reading</div>
    </div>
    <div className="px-1 pb-1 pt-3"><h2 className="truncate text-sm font-semibold text-zinc-100">{manga.title}</h2><p className="mt-1 truncate text-[11px] text-zinc-500">{manga.genres.slice(0,2).join(" · ")}</p><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.07]"><div className="card-progress h-full rounded-full" style={{width:`${pct}%`}}/></div><span className="font-mono text-[9px] text-zinc-500">{pct}%</span></div></div>
   </article>
 </Link>
}
