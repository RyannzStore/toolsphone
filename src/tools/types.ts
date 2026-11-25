export type CategoryId =
  | 'device'
  | 'file-media'
  | 'text'
  | 'security'
  | 'developer'
  | 'network'
  | 'calculator'
  | 'school'
  | 'finance'
  | 'time-unit'
  | 'generator';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  description: string;
  icon: string;
}

export interface ToolMeta {
  slug: string;
  name: string;
  description: string;
  category: CategoryId;
  /** Nama icon Lucide (lihat icons.ts) */
  icon: string;
  /** Default premium (owner dapat mengubahnya dari /admin → Tools) */
  premium?: boolean;
  /** True = butuh API native Android → hanya tersedia di aplikasi Android */
  native?: boolean;
  /** Tampil di "Fitur Populer" */
  popular?: boolean;
  keywords?: string[];
}

/** ToolMeta + status efektif setelah override dari database. */
export interface ResolvedTool extends ToolMeta {
  isPremium: boolean;
  isEnabled: boolean;
}
