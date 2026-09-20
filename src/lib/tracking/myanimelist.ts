import { bindCurrentUserCache } from '@/lib/storage/reader-storage';
import { idbDelete,idbGet,idbPut } from '@/lib/storage/idb';
import type { LibraryReadingStatus } from '@/lib/library/library-state';

const PROVIDER='myanimelist';
type MalAuth={provider:string;userId:string;accessToken:string;refreshToken:string;expiresAt:string};

export function isMyAnimeListConfigured(){return Boolean(process.env.NEXT_PUBLIC_MYANIMELIST_CLIENT_ID?.trim())}
function oauthKey(){if(typeof window==='undefined')return null;const owner=localStorage.getItem('pachimanga:cache-owner');return owner?`pachimanga:mal-oauth:${owner}`:null}
function randomVerifier(){const bytes=crypto.getRandomValues(new Uint8Array(64));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}

export function myAnimeListAuthorizeUrl(){
 const clientId=process.env.NEXT_PUBLIC_MYANIMELIST_CLIENT_ID?.trim();const key=oauthKey();if(!clientId||!key)return null;
 const verifier=randomVerifier();const state=randomVerifier().slice(0,48);sessionStorage.setItem(key,JSON.stringify({verifier,state}));
 const url=new URL('https://myanimelist.net/v1/oauth2/authorize');url.searchParams.set('response_type','code');url.searchParams.set('client_id',clientId);url.searchParams.set('code_challenge',verifier);url.searchParams.set('code_challenge_method','plain');url.searchParams.set('state',state);return url.toString();
}
async function saveTokens(input:{access_token:string;refresh_token:string;expires_in:number}){
 const user=await bindCurrentUserCache();await idbPut('trackerAuth',{provider:PROVIDER,userId:user.id,accessToken:input.access_token,refreshToken:input.refresh_token,expiresAt:new Date(Date.now()+Math.max(60,Number(input.expires_in)||3600)*1000).toISOString()} as unknown as Record<string,unknown>);
}
async function tokenRequest(body:Record<string,string>){const response=await fetch('/api/tracking/myanimelist/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const data=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;error?:string};if(!response.ok||!data.access_token||!data.refresh_token)throw new Error(data.error||'MyAnimeList token exchange failed.');await saveTokens({access_token:data.access_token,refresh_token:data.refresh_token,expires_in:Number(data.expires_in)||3600});return data.access_token}
export async function completeMyAnimeListOAuth(code:string,state:string){const key=oauthKey();if(!key)throw new Error('Missing MyAnimeList OAuth state.');const raw=sessionStorage.getItem(key);sessionStorage.removeItem(key);if(!raw)throw new Error('MyAnimeList OAuth session expired.');const stored=JSON.parse(raw) as {verifier?:string;state?:string};if(!stored.verifier||!stored.state||stored.state!==state)throw new Error('MyAnimeList OAuth state mismatch.');return tokenRequest({grant_type:'authorization_code',code,code_verifier:stored.verifier})}
export async function getMyAnimeListToken(){const user=await bindCurrentUserCache();const row=await idbGet<MalAuth>('trackerAuth',PROVIDER);if(!row||row.userId!==user.id)return null;if(Date.parse(row.expiresAt)>Date.now()+30_000)return row.accessToken;if(!row.refreshToken)return null;try{return await tokenRequest({grant_type:'refresh_token',refresh_token:row.refreshToken})}catch{await idbDelete('trackerAuth',PROVIDER);return null}}
export async function disconnectMyAnimeList(){await idbDelete('trackerAuth',PROVIDER)}
function malStatus(status:LibraryReadingStatus){if(status==='completed')return'completed';if(status==='on_hold')return'on_hold';if(status==='dropped')return'dropped';if(status==='plan_to_read')return'plan_to_read';return'reading'}
export async function syncMyAnimeListEntry(input:{mediaId:number;progress:number;status:LibraryReadingStatus}){const token=await getMyAnimeListToken();const clientId=process.env.NEXT_PUBLIC_MYANIMELIST_CLIENT_ID?.trim();if(!token||!clientId)throw new Error('Connect MyAnimeList in Settings before syncing.');const body=new URLSearchParams({status:malStatus(input.status),num_chapters_read:String(Math.max(0,Math.floor(input.progress)))});const response=await fetch(`https://api.myanimelist.net/v2/manga/${input.mediaId}/my_list_status`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'X-MAL-CLIENT-ID':clientId,'Content-Type':'application/x-www-form-urlencoded'},body});if(!response.ok){const error=await response.json().catch(()=>({})) as {message?:string;error?:string};throw new Error(error.message||error.error||`MyAnimeList HTTP ${response.status}`)}return response.json()}
