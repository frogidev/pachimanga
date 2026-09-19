import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withProviderConcurrency } from '@/lib/source/provider-limiter';

const QUERY='query ($search:String){Page(page:1,perPage:8){media(type:MANGA,search:$search,sort:SEARCH_MATCH){id idMal title{userPreferred romaji english native} coverImage{medium} chapters siteUrl}}}';

export async function GET(request:Request){
 const q=new URL(request.url).searchParams.get('q')?.trim()||'';
 if(!q || q.length>100) return NextResponse.json({items:[]},{status:q.length>100?400:200});
 const sb=await createClient();const{data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({items:[],error:'Authentication required.'},{status:401});
 try{
  const response=await withProviderConcurrency(`${user.id}:anilist`,()=>fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:QUERY,variables:{search:q}}),cache:'no-store'}));
  const body=await response.json() as {data?:{Page?:{media?:Array<{id:number;idMal?:number|null;title?:Record<string,string|null>;coverImage?:{medium?:string};chapters?:number|null;siteUrl?:string}>}};errors?:Array<{message?:string}>};
  if(!response.ok||body.errors?.length)throw new Error(body.errors?.[0]?.message||`AniList HTTP ${response.status}`);
  const items=(body.data?.Page?.media||[]).map(item=>({id:item.id,idMal:item.idMal??null,title:item.title?.userPreferred||item.title?.english||item.title?.romaji||item.title?.native||'Untitled',coverUrl:item.coverImage?.medium||'',chapters:item.chapters??null,siteUrl:item.siteUrl||''}));
  return NextResponse.json({items},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({items:[],error:error instanceof Error?error.message:'AniList search failed.'},{status:502,headers:{'Cache-Control':'private, no-store'}})}
}
