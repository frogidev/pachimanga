import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { PwaRegister } from '@/components/pwa-register';
import { WebVitalsReporter } from '@/components/web-vitals-reporter';
import { LocaleProvider } from '@/lib/i18n';
import './globals.css';
import './accessibility.css';

export const metadata: Metadata = {
  title: { default: 'Pachimanga', template: '%s · Pachimanga' },
  description: 'Your private manga library. Import, organize, read and sync manga across your devices with a required Pachimanga account.',
  applicationName: 'Pachimanga',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Pachimanga' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#140d16',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('pachimanga-theme')||'dark'}catch(e){}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            // ES5 only: Internet Explorer cannot run this app (no service workers or modern JavaScript), so tell the person instead of showing a blank page.
            __html: `(function(){if(!document.documentMode)return;function show(){document.body.style.cssText='margin:0;background:#09080d';document.body.innerHTML='<div style="font:16px Segoe UI,Arial,sans-serif;color:#f4f4f5;max-width:520px;margin:15vh auto;padding:0 20px;line-height:1.6"><h1 style="font-size:22px">Pachimanga needs a modern browser</h1><p>Internet Explorer is no longer supported by Microsoft and cannot run this app. Please open Pachimanga in Microsoft Edge, Chrome, Firefox or Safari.</p><h1 style="font-size:22px;margin-top:28px">Pachimanga necesita un navegador moderno</h1><p>Microsoft ya no da soporte a Internet Explorer y no puede ejecutar esta app. Abre Pachimanga en Microsoft Edge, Chrome, Firefox o Safari.</p></div>'}if(document.body){show()}else{document.addEventListener('DOMContentLoaded',show)}})();`,
          }}
        />
      </head>
      <body>
        <WebVitalsReporter />
        <LocaleProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
