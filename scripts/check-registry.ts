// Cek konsistensi: npm run check:registry
//  - slug unik, kategori valid
//  - semua icon registry ada di src/tools/icons.ts
//  - setiap tool non-native punya implementasi di src/tools/impl/<kategori>.tsx
import { readFileSync, existsSync } from 'node:fs';
import { TOOLS, CATEGORIES } from '../src/tools/registry.ts';

const IMPL_FILE: Record<string, string> = {
  device: 'device',
  'file-media': 'media',
  text: 'text',
  security: 'security',
  developer: 'developer',
  network: 'network',
  calculator: 'calculator',
  school: 'school',
  finance: 'finance',
  'time-unit': 'timeunit',
  generator: 'generator',
};

const problems: string[] = [];
const slugs = new Set<string>();
const catIds = new Set(CATEGORIES.map((c) => c.id));
const iconsSrc = readFileSync('src/tools/icons.ts', 'utf8');
const iconBlock = iconsSrc.split('const ICONS')[1] ?? '';
const iconNames = new Set(iconBlock.match(/[A-Z][A-Za-z0-9]+/g) ?? []);

for (const tool of TOOLS) {
  if (slugs.has(tool.slug)) problems.push('slug ganda: ' + tool.slug);
  slugs.add(tool.slug);
  if (!catIds.has(tool.category)) problems.push(`${tool.slug}: kategori tidak valid`);
  if (!/^[a-z0-9-]+$/.test(tool.slug)) problems.push(`${tool.slug}: slug tidak valid`);
  if (!iconNames.has(tool.icon)) problems.push(`${tool.slug}: icon "${tool.icon}" tidak ada di icons.ts`);
  if (tool.native) continue;
  const file = `src/tools/impl/${IMPL_FILE[tool.category]}.tsx`;
  if (!existsSync(file)) {
    problems.push(`${tool.slug}: file implementasi ${file} belum ada`);
    continue;
  }
  const src = readFileSync(file, 'utf8');
  const needle = new RegExp(`(?:['"]${tool.slug}['"]|^\\s*${tool.slug})\\s*:`, 'm');
  if (!needle.test(src)) problems.push(`${tool.slug}: belum terdaftar di ${file}`);
}

const native = TOOLS.filter((x) => x.native).length;
console.log(`Total tools: ${TOOLS.length} (web: ${TOOLS.length - native}, Android-only: ${native}), kategori: ${CATEGORIES.length}`);
if (problems.length) {
  console.error('\nMASALAH:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('Registry OK');
