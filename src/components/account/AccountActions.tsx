'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Card, Notice, TextField } from '@/components/tools/ui';

type Msg = { kind: 'success' | 'error'; text: string } | null;

/** Logout, ubah nama, ubah password, ubah email. Semua lewat Supabase Auth (password tidak pernah terlihat siapa pun). */
export function AccountActions({ email, displayName, userId }: { email: string; displayName: string; userId: string }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [msg, setMsg] = useState<Record<'name' | 'pw' | 'email' | 'out', Msg>>({ name: null, pw: null, email: null, out: null });
  const [busy, setBusy] = useState('');
  const set = (k: keyof typeof msg, m: Msg) => setMsg((p) => ({ ...p, [k]: m }));

  const run = async (key: keyof typeof msg, fn: () => Promise<string>) => {
    const sb = getSupabaseBrowser();
    if (!sb) return set(key, { kind: 'error', text: 'Layanan akun belum dikonfigurasi.' });
    setBusy(key);
    try {
      set(key, { kind: 'success', text: await fn() });
    } catch (e) {
      set(key, { kind: 'error', text: e instanceof Error ? e.message : 'Terjadi kesalahan.' });
    } finally {
      setBusy('');
    }
  };

  const saveName = () =>
    run('name', async () => {
      const n = name.trim();
      if (n.length < 2 || n.length > 40) throw new Error('Nama harus 2–40 karakter.');
      const { data, error } = await getSupabaseBrowser()!.from('profiles').update({ display_name: n }).eq('id', userId).select('id');
      if (error || !data?.length) throw new Error('Gagal menyimpan nama.');
      router.refresh();
      return 'Nama diperbarui.';
    });

  const savePw = () =>
    run('pw', async () => {
      if (pw.length < 8) throw new Error('Password minimal 8 karakter.');
      if (pw !== pw2) throw new Error('Konfirmasi password tidak sama.');
      const { error } = await getSupabaseBrowser()!.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message.includes('same') ? 'Password baru harus berbeda dari yang lama.' : 'Gagal mengubah password.');
      setPw('');
      setPw2('');
      return 'Password diperbarui.';
    });

  const saveEmail = () =>
    run('email', async () => {
      const v = newEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('Format email tidak valid.');
      const { error } = await getSupabaseBrowser()!.auth.updateUser({ email: v });
      if (error) throw new Error('Gagal mengubah email.');
      setNewEmail('');
      return 'Permintaan terkirim. Cek inbox untuk konfirmasi; email baru aktif setelah dikonfirmasi.';
    });

  const logout = () =>
    run('out', async () => {
      await getSupabaseBrowser()!.auth.signOut();
      router.replace('/');
      router.refresh();
      return 'Keluar…';
    });

  const note = (m: Msg) => (m ? <Notice kind={m.kind}>{m.text}</Notice> : null);

  return (
    <div className="space-y-4">
      <Card title="Profil">
        <p className="text-sm text-zinc-400">Email: <span className="font-mono text-zinc-200">{email}</span></p>
        <TextField label="Nama tampilan" value={name} onChange={setName} />
        {note(msg.name)}
        <button type="button" className="btn btn-sm" disabled={busy === 'name' || name.trim() === displayName} onClick={saveName}>Simpan nama</button>
      </Card>
      <Card title="Ubah password">
        <TextField label="Password baru" type="password" value={pw} onChange={setPw} hint="Minimal 8 karakter." />
        <TextField label="Ulangi password baru" type="password" value={pw2} onChange={setPw2} />
        {note(msg.pw)}
        <button type="button" className="btn btn-sm" disabled={busy === 'pw' || !pw} onClick={savePw}>Ubah password</button>
      </Card>
      <Card title="Ubah email">
        <TextField label="Email baru" type="email" inputMode="email" value={newEmail} onChange={setNewEmail} />
        {note(msg.email)}
        <button type="button" className="btn btn-sm" disabled={busy === 'email' || !newEmail} onClick={saveEmail}>Kirim konfirmasi</button>
      </Card>
      {note(msg.out)}
      <button type="button" className="btn btn-danger" disabled={busy === 'out'} onClick={logout}>
        <LogOut size={16} aria-hidden /> Keluar
      </button>
    </div>
  );
}
