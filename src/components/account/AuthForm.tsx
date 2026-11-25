'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Notice, TextField } from '@/components/tools/ui';
import { safeNextPath } from '@/lib/utils';
import { siteConfig } from '@/config/site';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const target = safeNextPath(next, '/');
  const qs = next ? `?next=${encodeURIComponent(target)}` : '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const sb = getSupabaseBrowser();
    if (!sb) return setError('Layanan akun belum dikonfigurasi.');
    const em = email.trim().toLowerCase();
    if (!EMAIL_RE.test(em)) return setError('Format email tidak valid.');
    if (mode === 'register') {
      const n = name.trim();
      if (n.length < 2 || n.length > 40) return setError('Nama harus 2–40 karakter.');
      if (pw.length < 8) return setError('Password minimal 8 karakter.');
      if (pw !== pw2) return setError('Konfirmasi password tidak sama.');
    } else if (!pw) {
      return setError('Isi password.');
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await sb.auth.signInWithPassword({ email: em, password: pw });
        if (err) {
          // Pesan generik: tidak membocorkan apakah email terdaftar.
          setError(/confirm/i.test(err.message) ? 'Email belum dikonfirmasi. Cek inbox kamu.' : 'Email atau password salah.');
          return;
        }
        router.replace(target);
        router.refresh();
      } else {
        const { data, error: err } = await sb.auth.signUp({
          email: em,
          password: pw,
          options: { data: { display_name: name.trim() }, emailRedirectTo: `${siteConfig.url}/login` },
        });
        if (err) {
          setError(/registered|exists/i.test(err.message) ? 'Email ini sudah terdaftar. Coba masuk.' : 'Pendaftaran gagal. Coba lagi beberapa saat.');
          return;
        }
        if (data.session) {
          router.replace(target);
          router.refresh();
        } else {
          setInfo('Pendaftaran berhasil. Cek inbox untuk konfirmasi email, lalu masuk.');
        }
      }
    } catch {
      setError('Tidak bisa terhubung. Periksa koneksimu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel panel-pad mx-auto w-full max-w-md space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">{mode === 'login' ? 'Masuk' : 'Buat akun'}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === 'login' ? 'Masuk untuk Favorites, History, dan sinkronisasi.' : 'Gratis. Tool dasar tetap bisa dipakai tanpa akun.'}
        </p>
      </div>
      {mode === 'register' ? <TextField label="Nama tampilan" value={name} onChange={setName} autoFocus /> : null}
      <TextField label="Email" type="email" inputMode="email" value={email} onChange={setEmail} autoFocus={mode === 'login'} />
      <TextField label="Password" type="password" value={pw} onChange={setPw} hint={mode === 'register' ? 'Minimal 8 karakter.' : undefined} />
      {mode === 'register' ? <TextField label="Ulangi password" type="password" value={pw2} onChange={setPw2} /> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {info ? <Notice kind="success">{info}</Notice> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
      </button>
      <p className="text-center text-sm text-zinc-400">
        {mode === 'login' ? (
          <>Belum punya akun? <Link href={`/register${qs}`} className="font-semibold text-accent">Daftar</Link></>
        ) : (
          <>Sudah punya akun? <Link href={`/login${qs}`} className="font-semibold text-accent">Masuk</Link></>
        )}
      </p>
    </form>
  );
}
