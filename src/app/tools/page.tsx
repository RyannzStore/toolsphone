import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getToolSettings } from '@/lib/data';
import { resolveAll } from '@/tools/registry';
import { ToolExplorer } from '@/components/tools/ToolExplorer';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Daftar semua utility tools ToolsPhone: file, teks, keamanan, developer, jaringan, kalkulator, sekolah, finance, dan device.',
};

export default async function ToolsPage() {
  const overrides = await getToolSettings();
  const tools = resolveAll(overrides);

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Tools</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {tools.length} tools. Cari berdasarkan nama, kegunaan, atau kategori.
        </p>
      </header>
      <Suspense fallback={<div className="skeleton h-11" aria-label="Memuat" />}>
        <ToolExplorer tools={tools} />
      </Suspense>
    </div>
  );
}
