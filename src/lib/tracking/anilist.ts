import { bindCurrentUserCache } from '@/lib/storage/reader-storage';
import { idbDelete, idbGet, idbPut } from '@/lib/storage/idb';
import type { LibraryReadingStatus } from '@/lib/library/library-state';

const API = 'https://graphql.anilist.co';
const PROVIDER = 'anilist';

type AniListAuth = { provider:string; userId:string; accessToken:string; expiresAt:string };

export function isAniListConfigured(){return Boolean(process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID?.trim())}

export function aniListAuthorizeUrl(){
  const clientId=process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID?.trim();
  if(!clientId) return null;
  const url=new URL('https://anilist.co/api/v2/oauth/authorize');
  url.searchParams.set('client_id',clientId);
  url.searchParams.set('response_type','token');
  return url.toString();
}

export async function saveAniListToken(accessToken:string,expiresInSeconds=365*24*60*60){
  if(!accessToken || accessToken.length>4096) throw new Error('Invalid AniList access token.');
  const user=await bindCurrentUserCache();
  const expiresAt=new Date(Date.now()+Math.max(60,expiresInSeconds)*1000).toISOString();
  await idbPut('trackerAuth',{provider:PROVIDER,userId:user.id,accessToken,expiresAt} as unknown as Record<string,unknown>);
}

export async function getAniListToken(){
  const user=await bindCurrentUserCache();
  const row=await idbGet<AniListAuth>('trackerAuth',PROVIDER);
  if(!row || row.userId!==user.id || Date.parse(row.expiresAt)<=Date.now()){
    if(row) await idbDelete('trackerAuth',PROVIDER);
    return null;
  }
  return row.accessToken;
}

export async function disconnectAniList(){await idbDelete('trackerAuth',PROVIDER)}

function aniListStatus(status:LibraryReadingStatus){
  if(status==='completed') return 'COMPLETED';
  if(status==='on_hold') return 'PAUSED';
  if(status==='dropped') return 'DROPPED';
  if(status==='plan_to_read') return 'PLANNING';
  return 'CURRENT';
}

export async function syncAniListEntry(input:{mediaId:number;progress:number;status:LibraryReadingStatus}){
  const token=await getAniListToken();
  if(!token) throw new Error('Connect AniList in Settings before syncing.');
  const response=await fetch(API,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
      query:'mutation ($mediaId:Int,$progress:Int,$status:MediaListStatus){SaveMediaListEntry(mediaId:$mediaId,progress:$progress,status:$status){id mediaId progress status}}',
      variables:{mediaId:input.mediaId,progress:Math.max(0,Math.floor(input.progress)),status:aniListStatus(input.status)},
    }),
  });
  const body=await response.json() as {data?:unknown;errors?:Array<{message?:string}>};
  if(!response.ok || body.errors?.length) throw new Error(body.errors?.[0]?.message || `AniList HTTP ${response.status}`);
  return body.data;
}
