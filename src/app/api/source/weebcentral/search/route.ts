import {NextResponse} from 'next/server';import {weebCentralSource} from '@/sources/weebcentral/weebcentral-source';
export async function GET(req:Request){const q=new URL(req.url).searchParams.get('q')||'';try{return NextResponse.json({items:await weebCentralSource.search(q)})}catch(e){return NextResponse.json({items:[],error:e instanceof Error?e.message:'Source unavailable'},{status:502})}}
