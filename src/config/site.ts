// Konfigurasi statis ToolsPhone. Data yang bisa diubah owner dari /admin (team, musik, APK, kontak)
// disimpan di Supabase; nilai di bawah ini adalah DEFAULT / fallback bila belum ada data di database.

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  emoji?: string | null;
  avatar_url?: string | null;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string | null;
  src: string;
}

export interface ContactLink {
  id: 'whatsapp' | 'tiktok';
  label: string;
  href: string;
}

export const siteConfig = {
  name: 'ToolsPhone',
  tagline: 'All-in-one utility tools.',
  description:
    'ToolsPhone adalah platform utility yang dibuat untuk membantu berbagai kebutuhan digital dalam satu tempat.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://toolsphone.auctionnuvexastore.biz.id',
  domainLabel: 'toolsphone.auctionnuvexastore.biz.id',
  version: 'v1.0.0',
  releaseDate: '2026-10-06',
  creator: 'Rannz',
  /** Taruh file video di public/Hero.mp4 */
  heroVideo: '/Hero.mp4',
  apk: {
    version: process.env.NEXT_PUBLIC_APK_VERSION || 'v1.0.0',
    url: process.env.NEXT_PUBLIC_APK_URL || '',
  },
  contact: {
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || '',
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || '',
  },
} as const;

/** Default Team Produksi — tambah anggota di sini, atau kelola dari /admin → Team. */
export const defaultTeam: TeamMember[] = [
  { id: 'rannz', name: 'Rannz', role: 'Owner', emoji: '👑' },
  { id: 'rendiz', name: 'Rendiz', role: 'Admin', emoji: null },
];

/** Default Live Music — ganti file di public/music/ atau kelola dari /admin → Musik. */
export const defaultTracks: MusicTrack[] = [
  { id: 'musik-1', title: 'Musik 1', artist: null, src: '/music/musik-1.mp3' },
  { id: 'musik-2', title: 'Musik 2', artist: null, src: '/music/musik-2.mp3' },
  { id: 'musik-3', title: 'Musik 3', artist: null, src: '/music/musik-3.mp3' },
];

export interface SiteSettings {
  apk_url: string;
  apk_version: string;
  whatsapp_url: string;
  tiktok_url: string;
}

export const defaultSiteSettings: SiteSettings = {
  apk_url: siteConfig.apk.url,
  apk_version: siteConfig.apk.version,
  whatsapp_url: siteConfig.contact.whatsapp,
  tiktok_url: siteConfig.contact.tiktok,
};

export function contactLinks(s: SiteSettings): ContactLink[] {
  const out: ContactLink[] = [];
  if (s.whatsapp_url) out.push({ id: 'whatsapp', label: 'WhatsApp', href: s.whatsapp_url });
  if (s.tiktok_url) out.push({ id: 'tiktok', label: 'TikTok', href: s.tiktok_url });
  return out;
}
