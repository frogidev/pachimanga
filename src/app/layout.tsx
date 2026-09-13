import type { Metadata,Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';
export const metadata:Metadata={title:{default:'Pachimanga',template:'%s · Pachimanga'},description:'Your manga. Everywhere. A fast local-first manga reader with smooth auto-scroll, imports, and private sync.',applicationName:'Pachimanga',icons:{icon:[{url:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{url:'/icons/icon-512.png',sizes:'512x512',type:'image/png'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Pachimanga'},formatDetection:{telephone:false}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#140d16'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body><PwaRegister/><AppShell>{children}</AppShell></body></html>}
