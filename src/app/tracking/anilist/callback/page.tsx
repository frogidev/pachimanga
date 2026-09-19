"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { saveAniListToken } from "@/lib/tracking/anilist";

export default function AniListCallbackPage(){
 const[message,setMessage]=useState("Completing AniList connection…");
 useEffect(()=>{const params=new URLSearchParams(window.location.hash.replace(/^#/,""));const token=params.get("access_token");const expires=Number(params.get("expires_in")||0);history.replaceState(null,"",window.location.pathname);if(!token){setMessage("AniList did not return an access token.");return}void saveAniListToken(token,expires>0?expires:365*24*60*60).then(()=>{window.location.replace("/settings#tracking")}).catch(error=>setMessage(error instanceof Error?error.message:"AniList connection failed."))},[]);
 return <div className="mx-auto max-w-xl px-4 py-16"><div className="surface-card p-6"><h1 className="text-xl font-semibold text-zinc-100">AniList connection</h1><p className="mt-3 text-sm text-zinc-400" role="status">{message}</p><Link href="/settings#tracking" className="button-secondary mt-5 inline-flex px-4 py-2 text-sm">Back to Settings</Link></div></div>
}
