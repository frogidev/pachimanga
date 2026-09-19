"use client";
import { useEffect,useState } from "react";
import { getAniListToken,isAniListConfigured,syncAniListEntry } from "@/lib/tracking/anilist";
import { getTrackerLink,removeTrackerLink,saveTrackerLink,type TrackerLink } from "@/lib/tracking/tracker-links";
import type { LibraryReadingStatus } from "@/lib/library/library-state";
import type { Manga } from "@/types/models";

type Result={id:number;idMal:number|null;title:string;coverUrl:string;chapters:number|null;siteUrl:string};

export function AniListTrackingPanel({manga,progress,status}:{manga:Manga;progress:number;status:LibraryReadingStatus}){
 const[connected,setConnected]=useState(false);const[link,setLink]=useState<TrackerLink|null>(null);const[results,setResults]=useState<Result[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
 const configured=isAniListConfigured();
 useEffect(()=>{let cancelled=false;if(!configured)return;void Promise.all([getAniListToken(),getTrackerLink(manga.sourceId,manga.id,'anilist')]).then(([token,current])=>{if(!cancelled){setConnected(Boolean(token));setLink(current)}}).catch(()=>{});return()=>{cancelled=true}},[configured,manga.id,manga.sourceId]);
 if(!configured||!connected)return null;
 async function search(){setBusy(true);setMessage("");try{const response=await fetch(`/api/tracking/anilist/search?q=${encodeURIComponent(manga.title)}`,{cache:"no-store"});const body=await response.json() as {items?:Result[];error?:string};if(!response.ok)throw new Error(body.error||"AniList search failed.");setResults(body.items||[])}catch(error){setMessage(error instanceof Error?error.message:"AniList search failed.")}finally{setBusy(false)}}
 async function choose(item:Result){setBusy(true);try{await saveTrackerLink({provider:'anilist',sourceId:manga.sourceId,mangaId:manga.id,mediaId:String(item.id),mediaTitle:item.title});setLink({provider:'anilist',sourceId:manga.sourceId,mangaId:manga.id,mediaId:String(item.id),mediaTitle:item.title,updatedAt:new Date().toISOString()});setResults([]);setMessage(`Linked to AniList: ${item.title}.`)}catch(error){setMessage(error instanceof Error?error.message:"Could not save tracker link.")}finally{setBusy(false)}}
 async function sync(){if(!link)return;setBusy(true);try{await syncAniListEntry({mediaId:Number(link.mediaId),progress,status});setMessage(`AniList synced through chapter ${Math.floor(progress)}.`)}catch(error){setMessage(error instanceof Error?error.message:"AniList sync failed.")}finally{setBusy(false)}}
 async function unlink(){if(!link)return;setBusy(true);try{await removeTrackerLink(manga.sourceId,manga.id,'anilist');setLink(null);setMessage("AniList title link removed.")}finally{setBusy(false)}}
 return <div className="mt-4 rounded-xl border border-sky-300/10 bg-sky-300/[.03] p-3">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-medium text-zinc-200">AniList tracking</div><div className="mt-1 text-xs text-zinc-500">{link?`Linked to ${link.mediaTitle}`:"Connect this manga to its AniList entry."}</div></div>
   <div className="flex gap-2">{link?<><button type="button" disabled={busy} onClick={()=>void sync()} className="button-secondary px-3 py-2 text-xs disabled:opacity-40">Sync now</button><button type="button" disabled={busy} onClick={()=>void unlink()} className="rounded-xl px-3 py-2 text-xs text-zinc-500 hover:bg-white/[.05]">Unlink</button></>:<button type="button" disabled={busy} onClick={()=>void search()} className="button-secondary px-3 py-2 text-xs disabled:opacity-40">{busy?"Searching…":"Find on AniList"}</button>}</div>
  </div>
  {results.length?<div className="mt-3 grid gap-2">{results.map(item=><button key={item.id} type="button" disabled={busy} onClick={()=>void choose(item)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/[.06] px-3 py-2 text-left text-xs hover:bg-white/[.04]"><span className="truncate text-zinc-300">{item.title}</span><span className="shrink-0 text-zinc-600">#{item.id}</span></button>)}</div>:null}
  <p className="mt-2 min-h-4 text-xs text-zinc-500" role="status" aria-live="polite">{message}</p>
 </div>
}
