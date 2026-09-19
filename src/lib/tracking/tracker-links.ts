import { createClient } from '@/lib/supabase/client';
import { bindCurrentUserCache } from '@/lib/storage/reader-storage';

export type TrackerLink={provider:'anilist'|'myanimelist';sourceId:string;mangaId:string;mediaId:string;mediaTitle:string;updatedAt:string};

export async function getTrackerLink(sourceId:string,mangaId:string,provider:TrackerLink['provider']){
  const user=await bindCurrentUserCache();const sb=createClient();
  const{data,error}=await sb.from('tracker_links').select('provider,source_id,manga_id,media_id,media_title,updated_at').eq('user_id',user.id).eq('source_id',sourceId).eq('manga_id',mangaId).eq('provider',provider).maybeSingle();
  if(error){if(error.code==='42P01')return null;throw error}
  return data?{provider:data.provider as TrackerLink['provider'],sourceId:data.source_id,mangaId:data.manga_id,mediaId:data.media_id,mediaTitle:data.media_title,updatedAt:data.updated_at}:null;
}

export async function saveTrackerLink(link:Omit<TrackerLink,'updatedAt'>){
  const user=await bindCurrentUserCache();const sb=createClient();const now=new Date().toISOString();
  const{error}=await sb.from('tracker_links').upsert({user_id:user.id,provider:link.provider,source_id:link.sourceId,manga_id:link.mangaId,media_id:link.mediaId,media_title:link.mediaTitle,updated_at:now},{onConflict:'user_id,source_id,manga_id,provider'});
  if(error){if(error.code==='42P01')throw new Error('Tracker link storage is not enabled on this environment yet.');throw error}
}
export async function removeTrackerLink(sourceId:string,mangaId:string,provider:TrackerLink['provider']){
  const user=await bindCurrentUserCache();const sb=createClient();const{error}=await sb.from('tracker_links').delete().eq('user_id',user.id).eq('source_id',sourceId).eq('manga_id',mangaId).eq('provider',provider);if(error)throw error;
}
