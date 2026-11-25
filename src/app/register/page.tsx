import type { Metadata } from 'next';
import { AuthForm } from '@/components/account/AuthForm';
import { Notice } from '@/components/tools/ui';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Daftar' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="pt-4 sm:pt-10">
      {isSupabaseConfigured ? (
        <AuthForm mode="register" next={typeof next === 'string' ? next : undefined} />
      ) : (
        <div className="mx-auto max-w-md">
          <Notice kind="warn">Fitur akun belum dikonfigurasi di server ini. Tool dasar tetap bisa dipakai tanpa login.</Notice>
        </div>
      )}
    </div>
  );
}
