import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms' };

const SECTIONS: { h: string; p: string }[] = [
  { h: 'Penggunaan', p: 'ToolsPhone disediakan apa adanya untuk membantu kebutuhan digital sehari-hari. Gunakan dengan wajar dan sesuai hukum yang berlaku.' },
  { h: 'Tool jaringan', p: 'Gunakan tool jaringan hanya pada alamat dan domain yang kamu miliki atau berwenang untuk diuji. Penyalahgunaan (misalnya memindai sistem pihak lain tanpa izin) dilarang, dan akses dapat dibatasi.' },
  { h: 'Akurasi hasil', p: 'Kami berusaha agar hasil tool akurat, tetapi tidak menjamin kecocokan untuk keperluan tertentu. Hasil perhitungan keuangan dan akademik bersifat simulasi/estimasi, bukan nasihat keuangan atau resmi dari institusi.' },
  { h: 'Premium', p: 'Beberapa tool ditandai Premium. Status dan masa aktif premium dikelola oleh owner/admin dan dapat berubah.' },
  { h: 'Akun', p: 'Kamu bertanggung jawab atas keamanan akunmu. Akun yang menyalahgunakan layanan dapat dinonaktifkan.' },
  { h: 'Perubahan', p: 'Fitur dan ketentuan ini dapat diperbarui sewaktu-waktu. Info penting akan diumumkan di halaman Notifikasi.' },
];

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Terms</h1>
        <p className="mt-1 text-sm text-zinc-500">Ketentuan penggunaan ToolsPhone.</p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.h} className="panel panel-pad space-y-1.5">
          <h2 className="font-semibold text-zinc-100">{s.h}</h2>
          <p className="text-sm leading-relaxed text-zinc-400">{s.p}</p>
        </section>
      ))}
    </article>
  );
}
