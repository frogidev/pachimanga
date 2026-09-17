import type { Metadata,Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';
import './accessibility.css';
export const metadata:Metadata={title:{default:'Pachimanga',template:'%s · Pachimanga'},description:'Your private manga library. Import, organize, read and sync manga across your devices with a required Pachimanga account.',applicationName:'Pachimanga',icons:{icon:[{url:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{url:'/icons/icon-512.png',sizes:'512x512',type:'image/png'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Pachimanga'},formatDetection:{telephone:false}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#140d16'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem('pachimanga-theme')||'dark'}catch(e){}`}} /></head><body><PwaRegister/><AppShell>{children}</AppShell></body></html>}
