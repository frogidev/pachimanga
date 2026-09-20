import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withProviderConcurrency } from '@/lib/source/provider-limiter';

export async function POST(request:Request){
 const sb=await createClient();const{data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 const clientId=process.env.NEXT_PUBLIC_MYANIMELIST_CLIENT_ID?.trim();if(!clientId)return NextResponse.json({error:'MyAnimeList is not configured.'},{status:503});
 const input=await request.json().catch(()=>({})) as Record<string,string>;const grant=input.grant_type;const form=new URLSearchParams({client_id:clientId,grant_type:grant||''});
 if(grant==='authorization_code'){if(!input.code||!input.code_verifier)return NextResponse.json({error:'Invalid authorization exchange.'},{status:400});form.set('code',input.code);form.set('code_verifier',input.code_verifier)}
 else if(grant==='refresh_token'){if(!input.refresh_token)return NextResponse.json({error:'Missing refresh token.'},{status:400});form.set('refresh_token',input.refresh_token)}
 else return NextResponse.json({error:'Unsupported OAuth grant.'},{status:400});
 const secret=process.env.MYANIMELIST_CLIENT_SECRET?.trim();if(secret)form.set('client_secret',secret);
 try{const response=await withProviderConcurrency(`${user.id}:myanimelist-oauth`,()=>fetch('https://myanimelist.net/v1/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:form,cache:'no-store'}));const data=await response.json() as Record<string,unknown>;if(!response.ok)return NextResponse.json({error:String(data.message||data.error||'MyAnimeList token exchange failed.')},{status:502,headers:{'Cache-Control':'private, no-store'}});return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'MyAnimeList token exchange failed.'},{status:502,headers:{'Cache-Control':'private, no-store'}})}
}
