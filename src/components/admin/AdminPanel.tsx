'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Card, Notice, NumField, Segmented, Stat, StatGrid, TextAreaField, TextField, fmtNum, parseNum } from '@/components/tools/ui';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { SiteSettings } from '@/config/site';
import type { Announcement, AnnouncementKind, AdminUserRow, TeamRow, TrackRow } from '@/types/db';
import { PremiumBadge } from '@/components/ui/Badges';

export interface AdminData {
  isOwner: boolean;
  selfId: string;
  stats: { users: number; premium_active: number; staff: number; uses_total: number } | null;
  usage: { slug: string; total: number }[];
  tools: { slug: string; name: string; category: string; isPremium: boolean; isEnabled: boolean }[];
  team: TeamRow[];
  tracks: TrackRow[];
  announcements: Announcement[];
  settings: SiteSettings;
}

type Tab = 'overview' | 'users' | 'tools' | 'music' | 'team' | 'announce' | 'settings';

/** Pesan error ramah; detail teknis tidak ditampilkan ke UI. */
function errText(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return '';
  if (e.code === '42501' || /forbidden|hanya owner|row-level security/i.test(e.message ?? '')) return 'Tidak diizinkan.';
  if (/violates check|check constraint/i.test(e.message ?? '')) return 'Data tidak valid (cek panjang/format).';
  return e.message && e.message.length < 120 ? e.message : 'Operasi gagal.';
}

function useMutation() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: (sb: NonNullable<ReturnType<typeof getSupabaseBrowser>>) => PromiseLike<{ error: { message?: string; code?: string } | null }>, ok = 'Tersimpan.') => {
      const sb = getSupabaseBrowser();
      if (!sb) return setMsg({ kind: 'error', text: 'Supabase belum dikonfigurasi.' });
      setBusy(true);
      let error: { message?: string; code?: string } | null;
      try {
        ({ error } = await fn(sb));
      } catch {
        error = { message: 'Koneksi gagal.' };
      } finally {
        setBusy(false);
      }
      if (error) {
        setMsg({ kind: 'error', text: errText(error) });
        return false;
      }
      setMsg({ kind: 'success', text: ok });
      router.refresh();
      return true;
    },
    [router],
  );
  return { run, msg, busy, clear: () => setMsg(null) };
}

const Msg = ({ m }: { m: { kind: 'success' | 'error'; text: string } | null }) => (m ? <Notice kind={m.kind}>{m.text}</Notice> : null);

// ───────────────────────────── Overview

function Overview({ data }: { data: AdminData }) {
  const max = Math.max(1, ...data.usage.map((u) => Number(u.total)));
  const names = useMemo(() => new Map(data.tools.map((t) => [t.slug, t.name])), [data.tools]);
  return (
    <div className="space-y-4">
      {data.stats ? (
        <StatGrid cols={4}>
          <Stat label="Total user" value={fmtNum(data.stats.users, 0)} accent />
          <Stat label="Premium aktif" value={fmtNum(data.stats.premium_active, 0)} />
          <Stat label="Staff" value={fmtNum(data.stats.staff, 0)} />
          <Stat label="Pemakaian tool" value={fmtNum(Number(data.stats.uses_total), 0)} sub="Semua waktu, agregat" />
        </StatGrid>
      ) : (
        <Notice kind="warn">Statistik tidak bisa dimuat. Pastikan supabase/schema.sql sudah dijalankan.</Notice>
      )}
      <Card title="Tool paling sering dipakai (30 hari)">
        {data.usage.length ? (
          <ul className="space-y-2">
            {data.usage.slice(0, 15).map((u) => (
              <li key={u.slug} className="text-sm">
                <div className="mb-1 flex justify-between gap-2">
                  <span className="truncate text-zinc-200">{names.get(u.slug) ?? u.slug}</span>
                  <span className="tabular-nums text-zinc-500">{fmtNum(Number(u.total), 0)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent" style={{ width: `${(Number(u.total) / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Belum ada data pemakaian.</p>
        )}
        <p className="text-xs text-zinc-500">Agregat anonim per tool; tidak ada data pribadi.</p>
      </Card>
    </div>
  );
}

// ───────────────────────────── Users

function Users({ data }: { data: AdminData }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [err, setErr] = useState('');
  const [days, setDays] = useState<Record<string, string>>({});
  const [until, setUntil] = useState<Record<string, string>>({});
  const [reload, setReload] = useState(0);
  const m = useMutation();

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const { data: rows, error } = await sb.rpc('admin_list_users', { p_search: q, p_limit: 50, p_offset: 0 });
      if (!alive) return;
      if (error) {
        setErr(errText(error));
        setUsers([]);
      } else {
        setErr('');
        setUsers(rows as AdminUserRow[]);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q, reload]);

  const act = async (fn: Parameters<typeof m.run>[0], ok: string) => {
    if (await m.run(fn, ok)) setReload((n) => n + 1);
  };
  const active = (u: AdminUserRow) => !!u.premium_until && new Date(u.premium_until).getTime() > Date.now();

  return (
    <div className="space-y-3">
      <TextField label="Cari user (email atau nama)" value={q} onChange={setQ} />
      <Msg m={m.msg} />
      {err ? <Notice kind="error">{err}</Notice> : null}
      {users === null ? <div className="skeleton h-24" /> : null}
      {users?.length === 0 && !err ? <p className="text-sm text-zinc-500">Tidak ada user ditemukan.</p> : null}
      <ul className="space-y-3">
        {users?.map((u) => (
          <li key={u.id} className="panel panel-pad space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-50">{u.display_name ?? '—'} <span className="ml-1 text-xs font-normal capitalize text-zinc-500">{u.role}</span></p>
                <p className="truncate font-mono text-xs text-zinc-400">{u.email}</p>
                <p className="text-xs text-zinc-600">Daftar {formatDate(u.created_at)}</p>
              </div>
              <div className="text-right text-xs">
                {u.role === 'owner' ? <span className="text-zinc-500">Owner</span> : active(u) ? (<><PremiumBadge /><p className="mt-1 text-zinc-500">s/d {formatDateTime(u.premium_until)}</p></>) : <span className="text-zinc-500">{u.premium_until ? `Premium berakhir ${formatDate(u.premium_until)}` : 'Free'}</span>}
              </div>
            </div>
            {u.role !== 'owner' ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-28">
                  <NumField label="Tambah hari" value={days[u.id] ?? '30'} onChange={(v) => setDays((d) => ({ ...d, [u.id]: v }))} />
                </div>
                <button type="button" className="btn btn-sm" disabled={m.busy} onClick={() => {
                  const n = parseNum(days[u.id] ?? '30');
                  if (n === null || !Number.isInteger(n) || n < 1 || n > 3650) return void act(async () => ({ error: { message: 'Durasi harus 1–3650 hari.' } }), '');
                  void act((sb) => sb.rpc('admin_extend_premium', { p_user: u.id, p_days: n }), `Premium diperpanjang ${n} hari.`);
                }}>Aktifkan / perpanjang</button>
                <label className="block">
                  <span className="label">Atur tanggal berakhir</span>
                  <input type="date" className="input !min-h-[40px]" aria-label="Tanggal berakhir premium" value={until[u.id] ?? ''} onChange={(e) => setUntil((d) => ({ ...d, [u.id]: e.target.value }))} />
                </label>
                <button type="button" className="btn btn-sm" disabled={m.busy || !/^\d{4}-\d{2}-\d{2}$/.test(until[u.id] ?? '')} onClick={() => {
                  const iso = new Date(`${until[u.id]}T23:59:59`).toISOString();
                  void act((sb) => sb.rpc('admin_set_premium', { p_user: u.id, p_until: iso }), 'Tanggal berakhir diperbarui.');
                }}>Simpan tanggal</button>
                <button type="button" className="btn btn-sm btn-danger" disabled={m.busy || !u.premium_until} onClick={() => {
                  if (window.confirm(`Cabut premium ${u.email}?`)) void act((sb) => sb.rpc('admin_set_premium', { p_user: u.id, p_until: null }), 'Premium dicabut.');
                }}>Cabut</button>
                {data.isOwner && u.id !== data.selfId ? (
                  <button type="button" className="btn btn-sm" disabled={m.busy} onClick={() => {
                    const next = u.role === 'admin' ? 'user' : 'admin';
                    if (window.confirm(`Ubah role ${u.email} menjadi ${next}?`)) void act((sb) => sb.rpc('admin_set_role', { p_user: u.id, p_role: next }), `Role menjadi ${next}.`);
                  }}>{u.role === 'admin' ? 'Jadikan user' : 'Jadikan admin'}</button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">Password tidak pernah ditampilkan — disimpan sebagai hash oleh Supabase Auth.</p>
    </div>
  );
}

// ───────────────────────────── Tools

function ToolsTab({ data }: { data: AdminData }) {
  const [q, setQ] = useState('');
  const m = useMutation();
  const list = data.tools.filter((t) => !q.trim() || `${t.name} ${t.slug} ${t.category}`.toLowerCase().includes(q.trim().toLowerCase()));
  const save = (t: AdminData['tools'][number], patch: Partial<{ is_premium: boolean; is_enabled: boolean }>) =>
    m.run((sb) => sb.from('tool_settings').upsert({ slug: t.slug, is_premium: t.isPremium, is_enabled: t.isEnabled, ...patch, updated_at: new Date().toISOString() }), 'Tool diperbarui.');
  return (
    <div className="space-y-3">
      <TextField label="Cari tool" value={q} onChange={setQ} />
      <Msg m={m.msg} />
      <ul className="panel divide-y divide-white/[0.06] overflow-hidden">
        {list.map((t) => (
          <li key={t.slug} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">{t.name}</p>
              <p className="text-xs text-zinc-600">{t.category}</p>
            </div>
            <div className="flex gap-4">
              <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={t.isPremium} disabled={m.busy} onChange={(e) => void save(t, { is_premium: e.target.checked })} /> Premium</label>
              <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={t.isEnabled} disabled={m.busy} onChange={(e) => void save(t, { is_enabled: e.target.checked })} /> Aktif</label>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">Catatan: pembatasan premium diterapkan di tampilan/server-render halaman, bukan enkripsi file tool.</p>
    </div>
  );
}

// ───────────────────────────── Music

function MusicTab({ data }: { data: AdminData }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [src, setSrc] = useState('/music/');
  const m = useMutation();
  const valid = title.trim() && /^(https:\/\/|\/)/.test(src.trim());
  return (
    <div className="space-y-3">
      <Msg m={m.msg} />
      <ul className="panel divide-y divide-white/[0.06] overflow-hidden">
        {data.tracks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-100">{t.title}{t.artist ? <span className="font-normal text-zinc-500"> · {t.artist}</span> : null}</p>
              <p className="truncate font-mono text-xs text-zinc-600">{t.src}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={t.is_active} disabled={m.busy} onChange={(e) => void m.run((sb) => sb.from('music_tracks').update({ is_active: e.target.checked }).eq('id', t.id))} /> Aktif</label>
              <button type="button" className="btn btn-sm !px-2.5" aria-label={`Hapus ${t.title}`} disabled={m.busy} onClick={() => window.confirm(`Hapus “${t.title}”?`) && void m.run((sb) => sb.from('music_tracks').delete().eq('id', t.id), 'Dihapus.')}><Trash2 size={14} aria-hidden /></button>
            </div>
          </li>
        ))}
        {data.tracks.length === 0 ? <li className="px-4 py-3 text-sm text-zinc-500">Belum ada track — aplikasi memakai 3 track bawaan (public/music/musik-1..3.mp3).</li> : null}
      </ul>
      <Card title="Tambah track">
        <TextField label="Judul" value={title} onChange={setTitle} />
        <TextField label="Artis (opsional)" value={artist} onChange={setArtist} />
        <TextField label="URL / path file" value={src} onChange={setSrc} mono hint="Path lokal (/music/nama.mp3) atau URL https://… . Pastikan kamu punya hak memakai musiknya." />
        <button type="button" className="btn btn-primary" disabled={!valid || m.busy} onClick={async () => {
          if (await m.run((sb) => sb.from('music_tracks').insert({ title: title.trim(), artist: artist.trim() || null, src: src.trim(), sort_order: data.tracks.length }), 'Track ditambahkan.')) { setTitle(''); setArtist(''); setSrc('/music/'); }
        }}><Plus size={16} aria-hidden /> Tambah</button>
      </Card>
    </div>
  );
}

// ───────────────────────────── Team

function TeamTab({ data }: { data: AdminData }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [emoji, setEmoji] = useState('');
  const m = useMutation();
  return (
    <div className="space-y-3">
      <Msg m={m.msg} />
      <ul className="panel divide-y divide-white/[0.06] overflow-hidden">
        {data.team.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span className="min-w-0 truncate text-zinc-100">{t.name} {t.emoji} <span className="text-zinc-500">· {t.role}</span></span>
            <button type="button" className="btn btn-sm !px-2.5" aria-label={`Hapus ${t.name}`} disabled={m.busy} onClick={() => window.confirm(`Hapus ${t.name} dari Team Produksi?`) && void m.run((sb) => sb.from('team_members').delete().eq('id', t.id), 'Dihapus.')}><Trash2 size={14} aria-hidden /></button>
          </li>
        ))}
        {data.team.length === 0 ? <li className="px-4 py-3 text-sm text-zinc-500">Belum ada data — aplikasi memakai default (Rannz, Rendiz).</li> : null}
      </ul>
      <Card title="Tambah anggota">
        <TextField label="Nama" value={name} onChange={setName} />
        <TextField label="Peran" value={role} onChange={setRole} placeholder="Admin" />
        <TextField label="Emoji (opsional)" value={emoji} onChange={setEmoji} />
        <button type="button" className="btn btn-primary" disabled={!name.trim() || !role.trim() || m.busy} onClick={async () => {
          if (await m.run((sb) => sb.from('team_members').insert({ name: name.trim(), role: role.trim(), emoji: emoji.trim() || null, sort_order: data.team.length }), 'Anggota ditambahkan.')) { setName(''); setRole(''); setEmoji(''); }
        }}><Plus size={16} aria-hidden /> Tambah</button>
      </Card>
    </div>
  );
}

// ───────────────────────────── Announcements

const KINDS: { value: AnnouncementKind; label: string }[] = [
  { value: 'announcement', label: 'Pengumuman' },
  { value: 'update', label: 'Update' },
  { value: 'tool', label: 'Tool baru' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'apk', label: 'APK' },
];

function AnnounceTab({ data }: { data: AdminData }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<AnnouncementKind>('announcement');
  const m = useMutation();
  return (
    <div className="space-y-3">
      <Card title="Pengumuman baru">
        <Segmented value={kind} onChange={setKind} options={KINDS} />
        <TextField label="Judul" value={title} onChange={setTitle} />
        <TextAreaField label="Isi" value={body} onChange={setBody} rows={4} />
        <Msg m={m.msg} />
        <button type="button" className="btn btn-primary" disabled={!title.trim() || !body.trim() || m.busy} onClick={async () => {
          if (await m.run((sb) => sb.from('announcements').insert({ title: title.trim(), body: body.trim(), kind }), 'Dipublikasikan.')) { setTitle(''); setBody(''); }
        }}>Publikasikan</button>
      </Card>
      <ul className="space-y-2">
        {data.announcements.map((a) => (
          <li key={a.id} className="panel panel-pad flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase text-accent">{KINDS.find((k) => k.value === a.kind)?.label}</p>
              <p className="font-semibold text-zinc-100">{a.title}</p>
              <p className="line-clamp-2 text-sm text-zinc-500">{a.body}</p>
              <p className="text-xs text-zinc-600">{formatDateTime(a.created_at)}</p>
            </div>
            <button type="button" className="btn btn-sm !px-2.5" aria-label="Hapus pengumuman" disabled={m.busy} onClick={() => window.confirm('Hapus pengumuman ini?') && void m.run((sb) => sb.from('announcements').delete().eq('id', a.id), 'Dihapus.')}><Trash2 size={14} aria-hidden /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────────── Settings

function SettingsTab({ data }: { data: AdminData }) {
  const [s, setS] = useState(data.settings);
  const m = useMutation();
  const save = () => {
    const rows = (Object.entries(s) as [keyof SiteSettings, string][]).map(([key, value]) => ({ key, value: value.trim() }));
    const bad = rows.find((r) => r.value && r.key.endsWith('_url') && !/^https?:\/\//i.test(r.value));
    if (bad) return void m.run(async () => ({ error: { message: `${bad.key} harus diawali http:// atau https://` } }));
    return m.run(
      (sb) => sb.from('app_settings').upsert(rows.filter((r) => r.value).map((r) => ({ key: r.key, value: r.value }))),
      'Pengaturan disimpan.',
    );
  };
  return (
    <Card title="Android & Kontak">
      <TextField label="URL APK" value={s.apk_url} onChange={(v) => setS({ ...s, apk_url: v })} inputMode="url" hint="Kosongkan = kartu Android menampilkan “Coming Soon”." />
      <TextField label="Versi APK" value={s.apk_version} onChange={(v) => setS({ ...s, apk_version: v })} />
      <TextField label="Link WhatsApp" value={s.whatsapp_url} onChange={(v) => setS({ ...s, whatsapp_url: v })} inputMode="url" placeholder="https://wa.me/62…" />
      <TextField label="Link TikTok" value={s.tiktok_url} onChange={(v) => setS({ ...s, tiktok_url: v })} inputMode="url" placeholder="https://www.tiktok.com/@…" />
      <Msg m={m.msg} />
      <button type="button" className="btn btn-primary" disabled={m.busy} onClick={() => void save()}>Simpan</button>
      <p className="text-xs text-zinc-500">Mengosongkan kolom tidak menghapus nilai yang sudah tersimpan; ubah dengan nilai baru atau hapus barisnya di Supabase.</p>
    </Card>
  );
}

// ───────────────────────────── Panel

export function AdminPanel({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<Tab>('overview');
  const body: Record<Tab, ReactNode> = {
    overview: <Overview data={data} />,
    users: <Users data={data} />,
    tools: <ToolsTab data={data} />,
    music: <MusicTab data={data} />,
    team: <TeamTab data={data} />,
    announce: <AnnounceTab data={data} />,
    settings: <SettingsTab data={data} />,
  };
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Admin</h1>
        <p className="text-sm text-zinc-500">Login sebagai {data.isOwner ? 'owner' : 'admin'}. Semua aksi diverifikasi ulang oleh database.</p>
      </header>
      <div className="overflow-x-auto pb-1">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Ringkasan' },
            { value: 'users', label: 'User' },
            { value: 'tools', label: 'Tools' },
            { value: 'music', label: 'Musik' },
            { value: 'team', label: 'Team' },
            { value: 'announce', label: 'Pengumuman' },
            { value: 'settings', label: 'Pengaturan' },
          ]}
        />
      </div>
      {body[tab]}
    </div>
  );
}
