import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import { siteConfig } from '@/config/site';
import { getViewer } from '@/lib/auth';
import { getSiteSettings, getTracks } from '@/lib/data';
import { PrefsProvider } from '@/components/providers/PrefsProvider';
import { MusicProvider } from '@/components/providers/MusicProvider';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: 'ToolsPhone — All-in-one utility tools', template: '%s · ToolsPhone' },
  description: siteConfig.description,
  applicationName: 'ToolsPhone',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'ToolsPhone',
    description: siteConfig.tagline,
    url: siteConfig.url,
    siteName: 'ToolsPhone',
    locale: 'id_ID',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#07080b',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

// Terapkan preferensi (aksen / animasi / kepadatan) sebelum paint agar tidak berkedip.
const PREF_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('tp:prefs:v1')||'{}'),d=document.documentElement;if(p.accent)d.dataset.accent=p.accent;if(p.motion)d.dataset.motion=p.motion;if(p.compact)d.dataset.density='compact'}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [viewer, tracks, settings] = await Promise.all([getViewer(), getTracks(), getSiteSettings()]);

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREF_SCRIPT }} />
      </head>
      <body>
        <PrefsProvider>
          <MusicProvider tracks={tracks}>
            <AppShell
              viewer={{ signedIn: viewer.signedIn, name: viewer.displayName, isStaff: viewer.isStaff }}
              apkUrl={settings.apk_url}
            >
              {children}
            </AppShell>
          </MusicProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
