import { cache } from 'react';
import { isHttpUrl } from '@/lib/utils';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  defaultSiteSettings,
  defaultTeam,
  defaultTracks,
  type MusicTrack,
  type SiteSettings,
  type TeamMember,
} from '@/config/site';
import type { Announcement, AppSettingRow, TeamRow, ToolSetting, TrackRow } from '@/types/db';
import type { ToolOverride } from '@/tools/registry';

/** Override status premium/enabled per tool dari tabel tool_settings. */
export const getToolSettings = cache(async (): Promise<Record<string, ToolOverride>> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from('tool_settings').select('slug, is_premium, is_enabled');
    if (error || !data) return {};
    const out: Record<string, ToolOverride> = {};
    for (const row of data as ToolSetting[]) out[row.slug] = { is_premium: row.is_premium, is_enabled: row.is_enabled };
    return out;
  } catch {
    return {};
  }
});

export const getTeam = cache(async (): Promise<TeamMember[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return defaultTeam;
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, name, role, emoji, avatar_url, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error || !data || data.length === 0) return defaultTeam;
    return (data as TeamRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      emoji: r.emoji,
      avatar_url: r.avatar_url,
    }));
  } catch {
    return defaultTeam;
  }
});

export const getTracks = cache(async (): Promise<MusicTrack[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return defaultTracks;
  try {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('id, title, artist, src, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error || !data || data.length === 0) return defaultTracks;
    return (data as TrackRow[]).map((r) => ({ id: r.id, title: r.title, artist: r.artist, src: r.src }));
  } catch {
    return defaultTracks;
  }
});

/** Pengaturan situs (APK, kontak) — database menimpa default dari env bila nilainya tidak kosong. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return defaultSiteSettings;
  try {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error || !data) return defaultSiteSettings;
    const merged: SiteSettings = { ...defaultSiteSettings };
    for (const row of data as AppSettingRow[]) {
      if (typeof row.value !== 'string' || !row.value.trim()) continue;
      if (row.key.endsWith('_url') && !isHttpUrl(row.value.trim())) continue; // tolak javascript:, data:, dll.
      if (row.key === 'apk_url' || row.key === 'apk_version' || row.key === 'whatsapp_url' || row.key === 'tiktok_url') {
        merged[row.key] = row.value.trim();
      }
    }
    return merged;
  } catch {
    return defaultSiteSettings;
  }
});

export const getAnnouncements = cache(async (limit = 30): Promise<Announcement[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, kind, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as Announcement[];
  } catch {
    return [];
  }
});
