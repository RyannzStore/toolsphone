export type Role = 'user' | 'admin' | 'owner';

export interface Profile {
  id: string;
  display_name: string | null;
  role: Role;
  premium_until: string | null;
  created_at: string;
}

export interface ToolSetting {
  slug: string;
  is_premium: boolean;
  is_enabled: boolean;
}

export type AnnouncementKind = 'update' | 'tool' | 'announcement' | 'maintenance' | 'apk';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: AnnouncementKind;
  created_at: string;
}

export interface TeamRow {
  id: string;
  name: string;
  role: string;
  emoji: string | null;
  avatar_url: string | null;
  sort_order: number;
}

export interface TrackRow {
  id: string;
  title: string;
  artist: string | null;
  src: string;
  sort_order: number;
  is_active: boolean;
}

export interface FavoriteRow {
  user_id: string;
  slug: string;
  created_at: string;
}

export interface HistoryRow {
  id: number;
  user_id: string;
  slug: string;
  created_at: string;
}

export interface SavedConfigRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  premium_until: string | null;
  created_at: string;
}

export interface ToolUsageRow {
  slug: string;
  day: string;
  count: number;
}

export interface AppSettingRow {
  key: string;
  value: unknown;
}
