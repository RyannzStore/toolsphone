import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: 'Tool yang berjalan di perangkatmu',
    p: ['Sebagian besar tool (gambar, PDF, teks, kalkulator, generator, dan sebagainya) memproses data langsung di browser. File dan teks yang kamu masukkan ke tool tersebut tidak diunggah ke server ToolsPhone.'],
  },
  {
    h: 'Tool jaringan',
    p: [
      'Tool seperti IP Lookup, DNS Lookup, HTTP Header, dan Domain Info mengirim IP atau domain yang kamu masukkan ke server ToolsPhone untuk diproses. Server dapat meneruskan permintaan ke layanan pihak ketiga (misalnya penyedia data geolokasi IP dan RDAP) untuk mengambil hasilnya.',
      'Server memakai alamat IP-mu untuk pembatasan laju permintaan (rate limit) di memori; kami tidak menyimpannya sebagai riwayat.',
    ],
  },
  {
    h: 'Akun',
    p: ['Bila kamu mendaftar, email dan data profil disimpan di Supabase. Password dikelola Supabase Auth dan tidak bisa dilihat oleh owner maupun admin. Fitur akun (Favorites, History, konfigurasi tersimpan) hanya bisa diakses oleh pemiliknya.'],
  },
  {
    h: 'Penyimpanan di browser',
    p: ['Preferensi tampilan, pilihan musik, dan data beberapa tool (misalnya flashcard atau riwayat kalkulator) disimpan di localStorage perangkatmu. Kamu bisa menghapusnya lewat pengaturan browser.'],
  },
  {
    h: 'Statistik pemakaian',
    p: ['Pemakaian tool dihitung secara agregat (jumlah per tool per hari, termasuk tamu) tanpa data pribadi. Untuk pengguna yang login, tersimpan juga riwayat pribadi hingga 100 entri terakhir yang hanya bisa dilihat dan dihapus olehmu. Kami tidak memasang iklan.'],
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Privacy</h1>
        <p className="mt-1 text-sm text-zinc-500">Ringkasan cara ToolsPhone menangani datamu.</p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.h} className="panel panel-pad space-y-2">
          <h2 className="font-semibold text-zinc-100">{s.h}</h2>
          {s.p.map((t) => <p key={t} className="text-sm leading-relaxed text-zinc-400">{t}</p>)}
        </section>
      ))}
    </article>
  );
}
