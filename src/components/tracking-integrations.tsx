"use client";
import { useEffect,useState } from "react";
import { aniListAuthorizeUrl,disconnectAniList,getAniListToken,isAniListConfigured } from "@/lib/tracking/anilist";
import { disconnectMyAnimeList,getMyAnimeListToken,isMyAnimeListConfigured,myAnimeListAuthorizeUrl } from "@/lib/tracking/myanimelist";

export function TrackingIntegrations(){
 const[connected,setConnected]=useState(false);const[malConnected,setMalConnected]=useState(false);const[ready,setReady]=useState(false);const[message,setMessage]=useState("");
 const configured=isAniListConfigured();const malConfigured=isMyAnimeListConfigured();
 async function refresh(){try{const [ani,mal]=await Promise.all([configured?getAniListToken():Promise.resolve(null),malConfigured?getMyAnimeListToken():Promise.resolve(null)]);setConnected(Boolean(ani));setMalConnected(Boolean(mal))}catch{setConnected(false);setMalConnected(false)}finally{setReady(true)}}
 useEffect(()=>{void refresh()},[]);
 async function disconnect(){await disconnectAniList();setConnected(false);setMessage("AniList disconnected on this device.")}
 function connect(){const url=aniListAuthorizeUrl();if(url)window.location.assign(url)}
 async function disconnectMal(){await disconnectMyAnimeList();setMalConnected(false);setMessage("MyAnimeList disconnected on this device.")}
 function connectMal(){const url=myAnimeListAuthorizeUrl();if(url)window.location.assign(url)}
 return <section id="tracking" className="surface-card p-5 sm:p-6" aria-labelledby="tracking-title">
  <p className="pixel-kicker text-[9px] text-pink-400">Tracking</p><h2 id="tracking-title" className="mt-1 text-lg font-semibold text-zinc-100">External reading trackers</h2>
  <p className="mt-1 text-sm leading-6 text-zinc-500">Tracker authentication stays on this device. Manga-to-tracker links may sync with your Pachimanga account, but bearer tokens are never exported or stored in Supabase.</p>
  <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
   <div><div className="font-medium text-zinc-200">AniList</div><div className="mt-1 text-xs text-zinc-500">{!configured?"Not configured on this deployment.":!ready?"Checking device connection…":connected?"Connected on this device.":"Available to connect."}</div></div>
   {configured&&ready?<div className="mt-3 sm:mt-0">{connected?<button type="button" onClick={()=>void disconnect()} className="button-secondary px-3 py-2 text-xs">Disconnect</button>:<button type="button" onClick={connect} className="button-primary px-3 py-2 text-xs">Connect AniList</button>}</div>:null}
  </div>
  <div className="mt-2 rounded-xl border border-white/[.07] bg-white/[.025] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
   <div><div className="font-medium text-zinc-200">MyAnimeList</div><div className="mt-1 text-xs text-zinc-500">{!malConfigured?"Not configured on this deployment.":!ready?"Checking device connection…":malConnected?"Connected on this device.":"Available to connect."}</div></div>
   {malConfigured&&ready?<div className="mt-3 sm:mt-0">{malConnected?<button type="button" onClick={()=>void disconnectMal()} className="button-secondary px-3 py-2 text-xs">Disconnect</button>:<button type="button" onClick={connectMal} className="button-primary px-3 py-2 text-xs">Connect MyAnimeList</button>}</div>:null}
  </div>
  {!configured?<p className="mt-3 text-xs text-zinc-600">Set NEXT_PUBLIC_ANILIST_CLIENT_ID and register the production callback URL before exposing connection controls.</p>:null}
  {!malConfigured?<p className="mt-2 text-xs text-zinc-600">Set NEXT_PUBLIC_MYANIMELIST_CLIENT_ID and register the production callback URL before exposing MyAnimeList controls.</p>:null}
  <p className="mt-3 min-h-5 text-xs text-zinc-500" role="status">{message}</p>
 </section>
}
