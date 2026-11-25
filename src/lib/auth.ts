import { cache } from 'react';
import type { Profile, Role } from '@/types/db';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface Viewer {
  signedIn: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  role: Role;
  premiumUntil: string | null;
  /** Premium aktif (belum expired) — owner/admin selalu dianggap premium. */
  hasPremium: boolean;
  isStaff: boolean;
  isOwner: boolean;
}

const GUEST: Viewer = {
  signedIn: false,
  userId: null,
  email: null,
  displayName: null,
  role: 'user',
  premiumUntil: null,
  hasPremium: false,
  isStaff: false,
  isOwner: false,
};

export function isPremiumActive(profile: Pick<Profile, 'premium_until'> | null | undefined): boolean {
  if (!profile?.premium_until) return false;
  return new Date(profile.premium_until).getTime() > Date.now();
}

/**
 * Info pengguna saat ini (di-cache per request). Selalu memakai supabase.auth.getUser()
 * (diverifikasi ke server Auth), bukan getSession() yang hanya membaca cookie.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return GUEST;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return GUEST;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, role, premium_until, created_at')
      .eq('id', user.id)
      .maybeSingle();
    const profile = (data as Profile | null) ?? null;
    const role: Role = profile?.role ?? 'user';
    const isStaff = role === 'admin' || role === 'owner';
    const meta = (user.user_metadata ?? {}) as { display_name?: string };
    return {
      signedIn: true,
      userId: user.id,
      email: user.email ?? null,
      displayName: profile?.display_name || meta.display_name || (user.email ? user.email.split('@')[0] : null),
      role,
      premiumUntil: profile?.premium_until ?? null,
      hasPremium: isStaff || isPremiumActive(profile),
      isStaff,
      isOwner: role === 'owner',
    };
  } catch {
    return GUEST;
  }
});
