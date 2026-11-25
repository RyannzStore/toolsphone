# ToolsPhone

All-in-one utility tools — Next.js 15 (App Router) + TypeScript + Tailwind + Supabase.
117 entri tool: 108 berjalan di web, 9 butuh API native (ditandai "Available in Android App").

## 1. Setup lokal

```bash
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Tanpa Supabase aplikasi tetap jalan dalam **mode tamu** (semua tool dasar, tanpa login/premium/admin).

### Aset yang harus kamu sediakan
- `public/Hero.mp4` — video hero Dashboard (lazy-load, bisa dimatikan di Pengaturan).
- `public/music/musik-1.mp3`, `musik-2.mp3`, `musik-3.mp3` — 3 track Live Music (ganti file kapan saja; judul/track bisa diatur di Admin → Musik). Pastikan kamu punya hak memakai musiknya.

## 2. Supabase
1. Buat project, lalu jalankan **seluruh** `supabase/schema.sql` di SQL Editor.
2. Authentication → Providers: aktifkan **Email** saja (jangan aktifkan Google). Atur Site URL dan Redirect URL ke domainmu.
3. Daftar akun lewat `/register`, lalu jadikan dirimu owner (SQL Editor):
   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'EMAIL_KAMU');
   ```
4. Owner bisa menjadikan admin dari **/admin → User**.

Keamanan: hanya **anon key** yang dipakai di aplikasi (jangan taruh service role key di env `NEXT_PUBLIC_*` maupun frontend). Role/premium tidak bisa diubah user dari browser (grant kolom dibatasi); perubahan lewat fungsi `admin_*` yang memeriksa role di database. Password tidak pernah terbaca siapa pun.

## 3. Environment
Lihat `.env.example`. Kontak (WhatsApp/TikTok) dan URL APK juga bisa diisi dari **/admin → Pengaturan** (menimpa env bila terisi).

## 4. Build & deploy (VPS: PM2 + Nginx)
```bash
npm run build
pm2 start npm --name toolsphone -- start    # port 3000
```
Nginx (contoh) — **timpa** `X-Forwarded-For` agar rate limit tidak bisa dipalsukan klien:
```nginx
server {
  server_name toolsphone.auctionnuvexastore.biz.id;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;   # timpa, jangan $proxy_add_x_forwarded_for
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Rate limit tool jaringan bersifat in-memory per instance (reset saat restart; tidak dibagi antar instance).

## 5. Menambah tool
1. Daftarkan di `src/tools/registry.ts` (slug, kategori, icon, premium default).
2. Tambah icon bila baru di `src/tools/icons.ts`.
3. Implementasi komponen di `src/tools/impl/<kategori>.tsx` (key `'slug': Komponen`).
4. `npm run check:registry` memastikan semuanya konsisten.

## 6. Tes
```bash
npm run typecheck
npm run check:registry
npm run test:logic     # logika murni di src/lib (butuh Node >= 22.6)
```

## Catatan jujur
- Premium dibatasi di render server halaman tool; chunk JS tool tetap bisa diunduh publik (tool berjalan di browser). Ini penguncian UI, bukan DRM.
- Tool native (CPU, sensor, SIM, dsb.) hanya tampil sebagai penjelasan "Available in Android App".
- Info Device memakai Web API dan bisa kosong di browser tertentu (mis. Battery API tidak ada di Safari/Firefox).
