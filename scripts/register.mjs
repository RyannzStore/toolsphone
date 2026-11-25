import { register } from 'node:module';

// Hook kecil agar import relatif tanpa ekstensi (gaya bundler) bisa dijalankan Node saat tes.
register('./ts-resolve-hooks.mjs', import.meta.url);
