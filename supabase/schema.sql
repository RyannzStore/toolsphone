-- =====================================================================
-- ToolsPhone — skema Supabase (jalankan SELURUHNYA di SQL Editor, sekali).
-- Aman dijalankan ulang (idempotent).
--
-- Prinsip keamanan:
--  * Semua tabel memakai RLS. Browser hanya memakai anon key.
--  * Role/premium TIDAK bisa diubah user lewat tabel (grant kolom dibatasi);
--    perubahan hanya lewat fungsi SECURITY DEFINER yang memeriksa role di database.
--  * Owner/admin tidak pernah bisa melihat password (disimpan hash oleh Supabase Auth).
--  * Service role key tidak dipakai di aplikasi ini.
--
-- Membuat OWNER pertama: daftar akun lewat /register, lalu jalankan di SQL Editor:
--   update public.profiles set role = 'owner'
--   where id = (select id from auth.users where email = 'EMAIL_KAMU');
-- =====================================================================

-- ───────────── profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or char_length(display_name) between 2 and 40),
  role          text not null default 'user' check (role in ('user', 'admin', 'owner')),
  premium_until timestamptz,
  created_at    timestamptz not null default now()
);

-- Helper role (SECURITY DEFINER agar tidak rekursif dengan RLS profiles)
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('admin', 'owner') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false);
$$;

-- Buat profil otomatis saat user mendaftar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  if n is null or char_length(n) < 2 then
    n := split_part(new.email, '@', 1);
  end if;
  n := left(n, 40);
  if char_length(n) < 2 then n := 'User'; end if;
  insert into public.profiles (id, display_name) values (new.id, n) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated; -- hanya nama; role & premium tidak bisa

-- ───────────── tool_settings (premium / enabled per tool)
create table if not exists public.tool_settings (
  slug       text primary key check (slug ~ '^[a-z0-9-]{1,64}$'),
  is_premium boolean not null default false,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.tool_settings enable row level security;
drop policy if exists tool_settings_read on public.tool_settings;
create policy tool_settings_read on public.tool_settings for select to anon, authenticated using (true);
drop policy if exists tool_settings_write on public.tool_settings;
create policy tool_settings_write on public.tool_settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
revoke all on public.tool_settings from anon, authenticated;
grant select on public.tool_settings to anon, authenticated;
grant insert, update, delete on public.tool_settings to authenticated;

-- ───────────── team_members
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  role       text not null check (char_length(role) between 1 and 60),
  emoji      text check (emoji is null or char_length(emoji) <= 8),
  avatar_url text check (avatar_url is null or avatar_url ~ '^(https://|/[^/])'),
  sort_order int not null default 0
);
alter table public.team_members enable row level security;
drop policy if exists team_read on public.team_members;
create policy team_read on public.team_members for select to anon, authenticated using (true);
drop policy if exists team_write on public.team_members;
create policy team_write on public.team_members for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
revoke all on public.team_members from anon, authenticated;
grant select on public.team_members to anon, authenticated;
grant insert, update, delete on public.team_members to authenticated;

-- ───────────── music_tracks
create table if not exists public.music_tracks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 80),
  artist     text check (artist is null or char_length(artist) <= 80),
  src        text not null check (src ~ '^(https://|/[^/])' and char_length(src) <= 500),
  sort_order int not null default 0,
  is_active  boolean not null default true
);
alter table public.music_tracks enable row level security;
drop policy if exists tracks_read on public.music_tracks;
create policy tracks_read on public.music_tracks for select to anon, authenticated
  using (is_active or public.is_staff());
drop policy if exists tracks_write on public.music_tracks;
create policy tracks_write on public.music_tracks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
revoke all on public.music_tracks from anon, authenticated;
grant select on public.music_tracks to anon, authenticated;
grant insert, update, delete on public.music_tracks to authenticated;

-- ───────────── app_settings (apk_url, apk_version, whatsapp_url, tiktok_url)
create table if not exists public.app_settings (
  key   text primary key check (key in ('apk_url', 'apk_version', 'whatsapp_url', 'tiktok_url')),
  value jsonb not null,
  check (jsonb_typeof(value) = 'string' and char_length(value #>> '{}') <= 500
         and (key = 'apk_version' or value #>> '{}' ~* '^https?://'))
);
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to anon, authenticated using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;

-- ───────────── announcements
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 2000),
  kind       text not null default 'announcement' check (kind in ('update', 'tool', 'announcement', 'maintenance', 'apk')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);
alter table public.announcements enable row level security;
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements for select to anon, authenticated using (true);
drop policy if exists ann_write on public.announcements;
create policy ann_write on public.announcements for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- ───────────── favorites
create table if not exists public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug       text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);
alter table public.favorites enable row level security;
drop policy if exists fav_own on public.favorites;
create policy fav_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.favorites from anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;

-- ───────────── history (diisi hanya lewat record_tool_use)
create table if not exists public.history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slug       text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  created_at timestamptz not null default now()
);
create index if not exists history_user_idx on public.history (user_id, created_at desc);
alter table public.history enable row level security;
drop policy if exists history_select on public.history;
create policy history_select on public.history for select to authenticated using (user_id = auth.uid());
drop policy if exists history_delete on public.history;
create policy history_delete on public.history for delete to authenticated using (user_id = auth.uid());
revoke all on public.history from anon, authenticated;
grant select, delete on public.history to authenticated;

-- ───────────── saved_configs
create table if not exists public.saved_configs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug       text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  name       text not null check (char_length(name) between 1 and 80),
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists saved_configs_user_idx on public.saved_configs (user_id, created_at desc);
alter table public.saved_configs enable row level security;
drop policy if exists cfg_own on public.saved_configs;
create policy cfg_own on public.saved_configs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.saved_configs from anon, authenticated;
grant select, insert, update, delete on public.saved_configs to authenticated;

-- ───────────── tool_usage (agregat; tanpa data pribadi; tidak bisa diakses langsung)
create table if not exists public.tool_usage (
  slug  text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  day   date not null default current_date,
  count bigint not null default 0,
  primary key (slug, day)
);
alter table public.tool_usage enable row level security; -- tanpa policy = tertutup untuk client
revoke all on public.tool_usage from anon, authenticated;

-- Catat pemakaian: agregat + (bila login) riwayat pribadi, maksimal 100 terakhir.
create or replace function public.record_tool_use(p_slug text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{1,64}$' then
    return;
  end if;
  -- batasi jumlah slug berbeda per hari agar tabel tidak bisa dibengkakkan oleh pemanggil anonim
  if not exists (select 1 from public.tool_usage where slug = p_slug and day = current_date)
     and (select count(*) from public.tool_usage where day = current_date) >= 300 then
    return;
  end if;
  insert into public.tool_usage (slug, day, count) values (p_slug, current_date, 1)
    on conflict (slug, day) do update set count = public.tool_usage.count + 1;
  if uid is not null then
    -- hindari duplikat beruntun dalam 1 menit
    if not exists (
      select 1 from public.history
      where user_id = uid and slug = p_slug and created_at > now() - interval '1 minute'
    ) then
      insert into public.history (user_id, slug) values (uid, p_slug);
      delete from public.history where user_id = uid and id not in (
        select id from public.history where user_id = uid order by created_at desc, id desc limit 100
      );
    end if;
  end if;
end $$;
revoke all on function public.record_tool_use(text) from public;
grant execute on function public.record_tool_use(text) to anon, authenticated;

-- ───────────── fungsi admin (semua memeriksa role di database)

create or replace function public.admin_list_users(p_search text default '', p_limit int default 50, p_offset int default 0)
returns table (id uuid, email text, display_name text, role text, premium_until timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.display_name, p.role, p.premium_until, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where coalesce(p_search, '') = ''
       or u.email ilike '%' || replace(replace(btrim(p_search), '%', ''), '_', '\_') || '%'
       or p.display_name ilike '%' || replace(replace(btrim(p_search), '%', ''), '_', '\_') || '%'
    order by p.created_at desc
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

-- Atur premium: p_until null = cabut. Tidak bisa dipakai pada owner.
create or replace function public.admin_set_premium(p_user uuid, p_until timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'owner') then
    raise exception 'owner tidak memerlukan premium';
  end if;
  update public.profiles set premium_until = p_until where id = p_user;
  if not found then raise exception 'user tidak ditemukan'; end if;
end $$;

-- Tambah durasi premium (hari) dari sisa masa aktif atau dari sekarang.
create or replace function public.admin_extend_premium(p_user uuid, p_days int) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  base timestamptz;
  result timestamptz;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days is null or p_days < 1 or p_days > 3650 then raise exception 'durasi harus 1–3650 hari'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'owner') then
    raise exception 'owner tidak memerlukan premium';
  end if;
  select greatest(coalesce(premium_until, now()), now()) into base from public.profiles where id = p_user;
  if base is null then raise exception 'user tidak ditemukan'; end if;
  result := base + make_interval(days => p_days);
  update public.profiles set premium_until = result where id = p_user;
  return result;
end $$;

-- Ubah role admin/user — hanya owner, tidak bisa untuk diri sendiri atau sesama owner.
create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'hanya owner' using errcode = '42501'; end if;
  if p_role not in ('user', 'admin') then raise exception 'role tidak valid'; end if;
  if p_user = auth.uid() then raise exception 'tidak bisa mengubah role sendiri'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'owner') then
    raise exception 'role owner tidak bisa diubah dari aplikasi';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then raise exception 'user tidak ditemukan'; end if;
end $$;

-- Ringkasan agregat (tanpa data pribadi)
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'premium_active', (select count(*) from public.profiles where premium_until > now()),
    'staff', (select count(*) from public.profiles where role in ('admin', 'owner')),
    'uses_total', coalesce((select sum(count) from public.tool_usage), 0)
  );
end $$;

create or replace function public.admin_usage(p_days int default 30)
returns table (slug text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select t.slug, sum(t.count)::bigint from public.tool_usage t
    where t.day >= current_date - least(greatest(p_days, 1), 365)
    group by t.slug order by 2 desc limit 50;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_list_users(text,int,int)', 'admin_set_premium(uuid,timestamptz)', 'admin_extend_premium(uuid,int)',
    'admin_set_role(uuid,text)', 'admin_stats()', 'admin_usage(int)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- is_staff/is_owner dipakai di policy RLS (juga untuk anon) → harus bisa dieksekusi; hasilnya false bagi tamu.
revoke all on function public.is_staff() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_owner() to anon, authenticated;

-- ───────────── data awal (opsional, aman bila kosong → aplikasi memakai default)
insert into public.team_members (name, role, emoji, sort_order)
select * from (values ('Rannz', 'Owner', '👑', 0), ('Rendiz', 'Admin', null, 1)) as v(name, role, emoji, sort_order)
where not exists (select 1 from public.team_members);

insert into public.music_tracks (title, src, sort_order)
select * from (values
  ('Musik 1', '/music/musik-1.mp3', 0),
  ('Musik 2', '/music/musik-2.mp3', 1),
  ('Musik 3', '/music/musik-3.mp3', 2)
) as v(title, src, sort_order)
where not exists (select 1 from public.music_tracks);
