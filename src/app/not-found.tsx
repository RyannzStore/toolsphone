import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="panel mx-auto mt-10 max-w-lg p-8 text-center">
      <p className="font-heading text-5xl font-bold text-accent">404</p>
      <h1 className="mt-2 text-xl font-semibold text-zinc-50">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-zinc-400">Link yang kamu buka tidak ada atau tool-nya sedang dinonaktifkan.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">Ke Dashboard</Link>
        <Link href="/tools" className="btn">Lihat Tools</Link>
      </div>
    </div>
  );
}
