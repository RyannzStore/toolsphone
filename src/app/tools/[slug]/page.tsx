import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Crown, Download, LogIn, Smartphone } from 'lucide-react';
import { getViewer } from '@/lib/auth';
import { getSiteSettings, getToolSettings } from '@/lib/data';
import { NATIVE_NOTE, getCategory, getTool, resolveTool } from '@/tools/registry';
import { getIcon } from '@/tools/icons';
import { ToolRunner } from '@/components/tools/ToolRunner';
import { ToolTracker } from '@/components/tools/ToolTracker';
import { FavoriteButton } from '@/components/tools/FavoriteButton';
import { ToolStatusBadge } from '@/components/ui/Badges';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: 'Tool tidak ditemukan' };
  return { title: tool.name, description: tool.description };
}

// Status premium/aktif & sesi user dibaca per request.
export const dynamic = 'force-dynamic';

const ANDROID_FEATURES: Record<string, string[]> = {
  'cpu-info': ['Model & arsitektur CPU', 'Jumlah core dan frekuensi per core', 'Beban CPU real-time'],
  'sensor-diagnostics': ['Daftar sensor perangkat', 'Nilai accelerometer, gyroscope, magnetometer', 'Uji fungsi sensor'],
  'thermal-status': ['Suhu baterai & CPU', 'Status throttling thermal', 'Peringatan overheat'],
  'sim-telephony': ['Operator & status SIM', 'Tipe jaringan seluler', 'Info sinyal'],
  flashlight: ['Nyalakan / matikan senter', 'Mode SOS dan kedip', 'Kontrol intensitas (bila didukung)'],
  vibration: ['Uji motor getar', 'Pola getar kustom', 'Intensitas haptic'],
  'battery-detail': ['Kondisi baterai (health)', 'Suhu & tegangan', 'Jumlah siklus (bila perangkat menyediakan)'],
  'installed-apps': ['Daftar aplikasi terpasang', 'Versi & ukuran aplikasi', 'Tanggal install / update'],
  'hardware-info': ['Model, brand, dan board', 'Info layar & kamera', 'Versi Android & patch keamanan'],
};

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getTool(slug);
  if (!meta) notFound();

  const [viewer, overrides, settings] = await Promise.all([getViewer(), getToolSettings(), getSiteSettings()]);
  const tool = resolveTool(meta, overrides[slug]);
  if (!tool.isEnabled) notFound();

  const category = getCategory(tool.category);
  const Icon = getIcon(tool.icon);
  const locked = tool.isPremium && !viewer.hasPremium;

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href={`/tools?cat=${tool.category}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
        >
          <ArrowLeft size={16} aria-hidden /> {category.label}
        </Link>
      </nav>

      <header className="mb-6 flex items-start gap-4">
        <span className="icon-tile !h-12 !w-12 !rounded-xl">
          <Icon size={24} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-50">{tool.name}</h1>
            <ToolStatusBadge premium={tool.isPremium} native={tool.native} />
          </div>
          <p className="mt-1 text-sm text-zinc-400">{tool.description}</p>
        </div>
        {!tool.native && !locked ? <FavoriteButton slug={tool.slug} signedIn={viewer.signedIn} /> : null}
      </header>

      {tool.native ? (
        <section className="panel panel-pad space-y-4" aria-labelledby="native-title">
          <div className="flex items-center gap-3">
            <Smartphone size={22} className="text-accent" aria-hidden />
            <h2 id="native-title" className="text-lg font-semibold text-zinc-50">
              Tersedia di aplikasi Android
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">
            Browser tidak menyediakan akses ke data ini, jadi ToolsPhone web tidak menampilkannya agar tidak ada angka yang menyesatkan. Fitur ini
            akan hadir di aplikasi ToolsPhone Android.
          </p>
          {ANDROID_FEATURES[tool.slug] ? (
            <ul className="space-y-1.5 text-sm text-zinc-300">
              {ANDROID_FEATURES[tool.slug].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">{NATIVE_NOTE}</p>
          )}
          {settings.apk_url ? (
            <a href={settings.apk_url} className="btn btn-primary" rel="noopener">
              <Download size={16} aria-hidden /> Download APK {settings.apk_version}
            </a>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="btn btn-sm cursor-not-allowed opacity-70" aria-disabled="true">
                Coming Soon
              </span>
              <span className="text-xs text-zinc-500">APK belum dirilis.</span>
            </div>
          )}
        </section>
      ) : locked ? (
        <section className="panel panel-pad space-y-4 text-center" aria-labelledby="upgrade-title">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 text-gold">
            <Crown size={26} aria-hidden />
          </span>
          <h2 id="upgrade-title" className="text-xl font-semibold text-zinc-50">
            Tool Premium
          </h2>
          <p className="mx-auto max-w-md text-sm text-zinc-400">
            {tool.name} khusus akun Premium. {viewer.signedIn ? 'Akunmu belum memiliki Premium aktif.' : 'Masuk dengan akun yang sudah memiliki Premium untuk memakainya.'}
          </p>
          {viewer.premiumUntil && !viewer.hasPremium ? (
            <p className="text-xs text-zinc-500">Premium sebelumnya sudah berakhir.</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            {viewer.signedIn ? (
              <Link href="/profile" className="btn btn-primary">
                Lihat status Premium
              </Link>
            ) : (
              <Link href={`/login?next=/tools/${tool.slug}`} className="btn btn-primary">
                <LogIn size={16} aria-hidden /> Masuk
              </Link>
            )}
            <Link href="/tools" className="btn">
              Lihat tool gratis
            </Link>
          </div>
          <p className="text-xs text-zinc-500">Premium diberikan oleh owner ToolsPhone. Hubungi lewat halaman About.</p>
        </section>
      ) : (
        <>
          <ToolRunner category={tool.category} slug={tool.slug} />
          <ToolTracker slug={tool.slug} />
        </>
      )}
    </div>
  );
}
