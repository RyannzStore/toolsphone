import type { CategoryId, CategoryMeta, ResolvedTool, ToolMeta } from './types';

export const CATEGORIES: CategoryMeta[] = [
  { id: 'device', label: 'Device Diagnostics', description: 'Cek info perangkat lewat Web API browser', icon: 'Smartphone' },
  { id: 'file-media', label: 'File & Media', description: 'Gambar & PDF, diproses di perangkatmu', icon: 'Image' },
  { id: 'text', label: 'Text', description: 'Hitung, rapikan, dan ubah teks', icon: 'Type' },
  { id: 'security', label: 'Security', description: 'Password, hash, encoding, dan QR', icon: 'Shield' },
  { id: 'developer', label: 'Developer', description: 'Formatter, regex, diff, timestamp', icon: 'Braces' },
  { id: 'network', label: 'Network', description: 'IP, subnet, DNS, dan cek URL', icon: 'Network' },
  { id: 'calculator', label: 'Calculator', description: 'Kalkulator harian sampai ilmiah', icon: 'Calculator' },
  { id: 'school', label: 'School', description: 'Nilai, IPK, timer belajar, flashcard', icon: 'GraduationCap' },
  { id: 'finance', label: 'Finance', description: 'Patungan, anggaran, cicilan, diskon', icon: 'Wallet' },
  { id: 'time-unit', label: 'Time & Unit', description: 'Stopwatch, tanggal, dan konversi satuan', icon: 'Clock' },
  { id: 'generator', label: 'Generator & Utility', description: 'Random, warna, QR kontak, barcode', icon: 'Sparkles' },
];

export const NATIVE_NOTE = 'Butuh API native — tersedia di aplikasi Android.';

type Opts = Partial<Pick<ToolMeta, 'premium' | 'native' | 'popular' | 'keywords'>>;

function t(category: CategoryId, slug: string, name: string, description: string, icon: string, opts: Opts = {}): ToolMeta {
  return { category, slug, name, description, icon, ...opts };
}

const device = (slug: string, name: string, desc: string, icon: string, opts: Opts = {}) =>
  t('device', slug, name, desc, icon, opts);
const native = (slug: string, name: string, icon: string, keywords: string[] = []) =>
  t('device', slug, name, NATIVE_NOTE, icon, { native: true, keywords });

export const TOOLS: ToolMeta[] = [
  // ───────────────────────── Device Diagnostics (Web API)
  device('battery-info', 'Info Baterai', 'Level & status pengisian dari browser', 'Battery', { popular: true, keywords: ['baterai', 'battery', 'charging'] }),
  device('ram-info', 'Info RAM', 'Perkiraan memori perangkat', 'MemoryStick', { popular: true, keywords: ['memory', 'memori'] }),
  device('storage-info', 'Info Storage', 'Kuota & pemakaian storage browser', 'HardDrive', { popular: true, keywords: ['penyimpanan', 'quota'] }),
  device('browser-info', 'Info Browser', 'Versi, bahasa, dan fitur browser', 'Globe', { keywords: ['user agent', 'chrome', 'firefox'] }),
  device('screen-info', 'Info Layar', 'Resolusi, DPR, dan orientasi layar', 'Monitor', { keywords: ['resolution', 'resolusi', 'dpi'] }),
  device('network-info', 'Info Jaringan', 'Tipe & kualitas koneksi (jika didukung)', 'Wifi', { keywords: ['koneksi', 'connection'] }),
  device('connection-status', 'Status Koneksi', 'Cek latensi ke server ToolsPhone', 'Signal', { keywords: ['ping', 'latency'] }),
  device('device-info', 'Info Perangkat', 'Ringkasan platform, CPU core, & lainnya', 'Smartphone', { popular: true, keywords: ['hp', 'phone', 'hardware'] }),
  device('online-status', 'Online / Offline', 'Pantau status online secara langsung', 'Radio', { keywords: ['internet'] }),
  // ───────────────────────── Device Diagnostics (butuh Android App)
  native('cpu-info', 'Informasi CPU', 'Cpu', ['processor', 'prosesor']),
  native('sensor-diagnostics', 'Diagnostik Sensor', 'Compass', ['gyroscope', 'accelerometer']),
  native('thermal-status', 'Status Thermal', 'Thermometer', ['suhu', 'temperature', 'panas']),
  native('sim-telephony', 'SIM / Telephony', 'Phone', ['sim', 'operator', 'imei']),
  native('flashlight', 'Senter', 'Flashlight', ['torch', 'lampu']),
  native('vibration', 'Getar', 'Vibrate', ['vibrate', 'haptic']),
  native('battery-detail', 'Detail Baterai', 'BatteryCharging', ['kesehatan baterai', 'battery health']),
  native('installed-apps', 'Aplikasi Terpasang', 'LayoutGrid', ['apps', 'aplikasi']),
  native('hardware-info', 'Info Hardware', 'CircuitBoard', ['spesifikasi', 'specs']),

  // ───────────────────────── File & Media
  t('file-media', 'compress-image', 'Compress Image', 'Kecilkan ukuran gambar tanpa upload', 'ImageDown', { popular: true, keywords: ['kompres', 'jpg', 'webp', 'ukuran'] }),
  t('file-media', 'resize-image', 'Resize Image', 'Ubah dimensi gambar (px atau %)', 'Scaling', { keywords: ['ubah ukuran', 'dimensi'] }),
  t('file-media', 'crop-image', 'Crop Image', 'Potong bagian gambar yang dibutuhkan', 'Crop', { keywords: ['potong'] }),
  t('file-media', 'rotate-image', 'Rotate Image', 'Putar & balik (flip) gambar', 'RotateCw', { keywords: ['putar', 'flip', 'mirror'] }),
  t('file-media', 'jpg-to-png', 'JPG → PNG', 'Ubah JPG menjadi PNG', 'FileImage', { keywords: ['convert', 'konversi'] }),
  t('file-media', 'png-to-jpg', 'PNG → JPG', 'Ubah PNG menjadi JPG', 'FileImage', { keywords: ['convert', 'konversi'] }),
  t('file-media', 'webp-to-jpg', 'WebP → JPG', 'Ubah WebP menjadi JPG', 'FileImage', { keywords: ['convert', 'konversi'] }),
  t('file-media', 'image-to-pdf', 'Image → PDF', 'Gabungkan gambar menjadi satu PDF', 'FileType', { premium: true, keywords: ['jpg to pdf', 'foto ke pdf'] }),
  t('file-media', 'merge-pdf', 'Merge PDF', 'Gabungkan beberapa PDF jadi satu', 'Merge', { premium: true, keywords: ['gabung pdf'] }),
  t('file-media', 'split-pdf', 'Split PDF', 'Pisah / ambil halaman tertentu dari PDF', 'Split', { premium: true, keywords: ['pisah pdf', 'extract'] }),

  // ───────────────────────── Text
  t('text', 'word-counter', 'Word Counter', 'Hitung kata, kalimat, paragraf, waktu baca', 'Text', { keywords: ['kata', 'jumlah kata'] }),
  t('text', 'character-counter', 'Character Counter', 'Hitung karakter, byte, dan baris', 'Hash', { keywords: ['karakter', 'huruf'] }),
  t('text', 'remove-duplicate-lines', 'Remove Duplicate Lines', 'Hapus baris duplikat', 'ListX', { keywords: ['duplikat', 'unik', 'unique'] }),
  t('text', 'remove-empty-lines', 'Remove Empty Lines', 'Hapus baris kosong', 'Eraser', { keywords: ['baris kosong', 'blank'] }),
  t('text', 'uppercase', 'Uppercase', 'Ubah teks menjadi HURUF BESAR', 'CaseUpper', { keywords: ['huruf besar', 'kapital'] }),
  t('text', 'lowercase', 'Lowercase', 'Ubah teks menjadi huruf kecil', 'CaseLower', { keywords: ['huruf kecil'] }),
  t('text', 'capitalize', 'Capitalize', 'Kapitalisasi tiap kata / kalimat', 'CaseSensitive', { keywords: ['title case', 'kapitalisasi'] }),
  t('text', 'reverse-text', 'Reverse Text', 'Balik teks per karakter, kata, atau baris', 'ArrowLeftRight', { keywords: ['balik', 'terbalik'] }),
  t('text', 'sort-lines', 'Sort Lines', 'Urutkan baris A–Z, Z–A, atau panjang', 'ArrowDownUp', { keywords: ['urutkan', 'sort'] }),
  t('text', 'text-cleaner', 'Text Cleaner', 'Bersihkan spasi, HTML, dan karakter aneh', 'Sparkles', { keywords: ['rapikan', 'clean', 'trim'] }),

  // ───────────────────────── Security
  t('security', 'password-generator', 'Password Generator', 'Buat password acak yang kuat', 'KeyRound', { popular: true, keywords: ['sandi', 'random'] }),
  t('security', 'random-string', 'Random String', 'Buat string acak sesuai karakter pilihan', 'Dices', { keywords: ['token', 'acak'] }),
  t('security', 'uuid-generator', 'UUID Generator', 'Buat UUID v4 (bisa banyak sekaligus)', 'Fingerprint', { keywords: ['guid'] }),
  t('security', 'hash-generator', 'Hash Generator', 'MD5, SHA-1, SHA-256, SHA-384, SHA-512', 'Binary', { keywords: ['md5', 'sha', 'checksum'] }),
  t('security', 'base64-encoder', 'Base64 Encoder', 'Encode teks ke Base64', 'Lock', { keywords: ['encode'] }),
  t('security', 'base64-decoder', 'Base64 Decoder', 'Decode Base64 ke teks', 'Unlock', { keywords: ['decode'] }),
  t('security', 'url-encoder', 'URL Encoder', 'Encode teks agar aman di URL', 'Link', { keywords: ['percent encoding'] }),
  t('security', 'url-decoder', 'URL Decoder', 'Decode teks URL (%20 dst.)', 'Unlink', { keywords: ['percent decoding'] }),
  t('security', 'qr-generator', 'QR Generator', 'Buat QR Code dari teks atau link', 'QrCode', { popular: true, keywords: ['qr code', 'barcode'] }),
  t('security', 'qr-reader', 'QR Reader', 'Baca QR dari gambar atau kamera', 'ScanLine', { keywords: ['scan', 'pindai'] }),

  // ───────────────────────── Developer
  t('developer', 'json-formatter', 'JSON Formatter', 'Rapikan & indentasi JSON', 'Braces', { popular: true, keywords: ['beautify', 'pretty'] }),
  t('developer', 'json-minifier', 'JSON Minifier', 'Padatkan JSON jadi satu baris', 'Minimize2', { keywords: ['compress'] }),
  t('developer', 'json-validator', 'JSON Validator', 'Cek JSON valid + lokasi error', 'ShieldCheck', { keywords: ['validate', 'cek'] }),
  t('developer', 'xml-formatter', 'XML Formatter', 'Rapikan XML & cek well-formed', 'FileCode', { keywords: ['beautify'] }),
  t('developer', 'html-formatter', 'HTML Formatter', 'Rapikan kode HTML', 'Code', { keywords: ['beautify'] }),
  t('developer', 'css-formatter', 'CSS Formatter', 'Rapikan atau minify CSS', 'Palette', { keywords: ['beautify', 'minify'] }),
  t('developer', 'javascript-formatter', 'JavaScript Formatter', 'Rapikan kode JavaScript', 'FileCode', { keywords: ['js', 'beautify'] }),
  t('developer', 'regex-tester', 'Regex Tester', 'Uji regex dengan highlight & grup', 'Regex', { keywords: ['regular expression'] }),
  t('developer', 'text-diff', 'Text Diff', 'Bandingkan dua teks per baris', 'Diff', { keywords: ['compare', 'bandingkan', 'perbedaan'] }),
  t('developer', 'timestamp-converter', 'Timestamp Converter', 'Unix timestamp ↔ tanggal', 'CalendarClock', { keywords: ['epoch', 'unix'] }),

  // ───────────────────────── Network
  t('network', 'ip-checker', 'IP Checker', 'Lihat IP publikmu & info lokasi/ISP', 'Globe', { popular: true, keywords: ['ip saya', 'my ip'] }),
  t('network', 'ipv4-calculator', 'IPv4 Calculator', 'Network, broadcast, host range IPv4', 'Network', { keywords: ['netmask'] }),
  t('network', 'ipv6-calculator', 'IPv6 Calculator', 'Ringkas/expand & range IPv6', 'Network', { keywords: ['prefix'] }),
  t('network', 'cidr-calculator', 'CIDR Calculator', 'Range CIDR & cek IP di dalam blok', 'Route', { keywords: ['cidr'] }),
  t('network', 'subnet-calculator', 'Subnet Calculator', 'Bagi jaringan jadi subnet', 'Split', { keywords: ['vlsm', 'subnetting'] }),
  t('network', 'dns-lookup', 'DNS Lookup', 'A, AAAA, MX, TXT, NS, CNAME, SOA', 'Search', { keywords: ['dns', 'domain'] }),
  t('network', 'http-status-checker', 'HTTP Status Checker', 'Cek status, redirect, & header URL', 'Activity', { keywords: ['status code', 'redirect'] }),
  t('network', 'url-parser', 'URL Parser', 'Pecah URL jadi bagian-bagiannya', 'Link', { keywords: ['query', 'parameter'] }),
  t('network', 'user-agent-parser', 'User-Agent Parser', 'Baca browser, OS, dan perangkat', 'Smartphone', { keywords: ['ua'] }),
  t('network', 'domain-information', 'Domain Information', 'DNS + data RDAP (registrar, expiry)', 'Server', { keywords: ['whois', 'rdap'] }),

  // ───────────────────────── Calculator
  t('calculator', 'basic-calculator', 'Basic Calculator', 'Kalkulator harian dengan keypad', 'Calculator', { popular: true, keywords: ['hitung'] }),
  t('calculator', 'scientific-calculator', 'Scientific Calculator', 'Trigonometri, log, akar, faktorial', 'Sigma', { premium: true, keywords: ['ilmiah', 'sin', 'cos'] }),
  t('calculator', 'percentage', 'Percentage', 'Hitung persen dengan 3 mode', 'Percent', { keywords: ['persen'] }),
  t('calculator', 'discount', 'Discount', 'Hitung harga setelah diskon', 'Tag', { keywords: ['diskon'] }),
  t('calculator', 'profit', 'Profit', 'Untung, margin, dan markup', 'TrendingUp', { keywords: ['untung', 'margin'] }),
  t('calculator', 'average', 'Average', 'Rata-rata, median, modus, & statistik', 'Sigma', { keywords: ['mean', 'rata-rata'] }),
  t('calculator', 'fraction', 'Fraction', 'Operasi pecahan + penyederhanaan', 'Divide', { keywords: ['pecahan'] }),
  t('calculator', 'ratio', 'Ratio', 'Sederhanakan rasio & selesaikan proporsi', 'Scale', { keywords: ['perbandingan', 'proporsi'] }),
  t('calculator', 'area', 'Area', 'Luas bangun datar', 'Ruler', { keywords: ['luas'] }),
  t('calculator', 'volume', 'Volume', 'Volume bangun ruang', 'Box', { keywords: ['isi'] }),

  // ───────────────────────── School
  t('school', 'average-grade', 'Average Grade', 'Rata-rata nilai (bisa berbobot)', 'Award', { keywords: ['nilai', 'rata-rata'] }),
  t('school', 'final-grade', 'Final Grade', 'Hitung nilai akhir & target nilai ujian', 'GraduationCap', { keywords: ['nilai akhir', 'target'] }),
  t('school', 'school-percentage', 'Percentage', 'Skor → persentase & predikat', 'Percent', { keywords: ['persentase nilai'] }),
  t('school', 'grade-converter', 'Grade Converter', 'Angka ↔ huruf ↔ skala 4.0', 'ArrowLeftRight', { keywords: ['konversi nilai'] }),
  t('school', 'gpa-calculator', 'GPA Calculator', 'Hitung IP / IPK dari SKS & nilai', 'BookOpen', { keywords: ['ipk', 'ips', 'sks'] }),
  t('school', 'pomodoro', 'Pomodoro', 'Timer fokus 25/5 yang bisa diatur', 'Timer', { keywords: ['fokus', 'belajar'] }),
  t('school', 'study-timer', 'Study Timer', 'Catat sesi belajar per mata pelajaran', 'Hourglass', { keywords: ['belajar'] }),
  t('school', 'exam-countdown', 'Exam Countdown', 'Hitung mundur ke tanggal ujian', 'CalendarDays', { keywords: ['ujian', 'ulangan'] }),
  t('school', 'flashcard', 'Flashcard', 'Kartu hafalan yang tersimpan di perangkat', 'Layers', { keywords: ['hafalan', 'kartu'] }),
  t('school', 'random-quiz', 'Random Quiz', 'Kuis acak dari soal buatanmu', 'Brain', { keywords: ['kuis', 'latihan soal'] }),

  // ───────────────────────── Finance
  t('finance', 'split-bill', 'Split Bill', 'Bagi tagihan + pajak, service, tip', 'Receipt', { keywords: ['patungan', 'bagi'] }),
  t('finance', 'daily-budget', 'Daily Budget', 'Jatah belanja harian dari anggaran', 'Wallet', { keywords: ['anggaran', 'uang jajan'] }),
  t('finance', 'savings-target', 'Savings Target', 'Berapa lama / berapa per bulan untuk target', 'PiggyBank', { keywords: ['tabungan', 'nabung'] }),
  t('finance', 'installment-calculator', 'Installment Calculator', 'Cicilan flat atau anuitas + tabel', 'Landmark', { keywords: ['cicilan', 'kredit', 'pinjaman'] }),
  t('finance', 'discount-tax', 'Discount + Tax', 'Diskon lalu pajak (atau sebaliknya)', 'Percent', { keywords: ['ppn', 'pajak'] }),
  t('finance', 'profit-loss', 'Profit / Loss', 'Untung-rugi dari modal & jual', 'TrendingUp', { keywords: ['untung rugi'] }),
  t('finance', 'price-after-discount', 'Price After Discount', 'Harga akhir dengan diskon bertingkat', 'Tag', { keywords: ['diskon bertingkat'] }),
  t('finance', 'percentage-increase', 'Percentage Increase', 'Naik X% atau hitung persen kenaikan', 'TrendingUp', { keywords: ['kenaikan'] }),
  t('finance', 'percentage-decrease', 'Percentage Decrease', 'Turun X% atau hitung persen penurunan', 'TrendingDown', { keywords: ['penurunan'] }),

  // ───────────────────────── Time & Unit
  t('time-unit', 'stopwatch', 'Stopwatch', 'Stopwatch dengan lap', 'Timer', { keywords: ['lap'] }),
  t('time-unit', 'timer', 'Timer', 'Timer hitung mundur dengan alarm', 'Hourglass', { keywords: ['countdown', 'alarm'] }),
  t('time-unit', 'countdown', 'Countdown', 'Hitung mundur ke tanggal & jam tertentu', 'CalendarClock', { keywords: ['hitung mundur'] }),
  t('time-unit', 'age-calculator', 'Age Calculator', 'Umur tepat & ulang tahun berikutnya', 'Cake', { keywords: ['umur', 'usia'] }),
  t('time-unit', 'date-difference', 'Date Difference', 'Selisih dua tanggal (tahun–detik)', 'CalendarRange', { keywords: ['selisih'] }),
  t('time-unit', 'days-between-dates', 'Days Between Dates', 'Jumlah hari, minggu, & hari kerja', 'CalendarDays', { keywords: ['hari kerja'] }),
  t('time-unit', 'length-converter', 'Length Converter', 'Konversi satuan panjang', 'Ruler', { keywords: ['meter', 'km', 'inci'] }),
  t('time-unit', 'weight-converter', 'Weight Converter', 'Konversi satuan berat', 'Weight', { keywords: ['kg', 'gram', 'pound'] }),
  t('time-unit', 'temperature-converter', 'Temperature Converter', 'Celsius, Fahrenheit, Kelvin, Rankine', 'Thermometer', { keywords: ['suhu'] }),
  t('time-unit', 'storage-converter', 'Storage Converter', 'Byte, KB, MB, GB, TB (desimal & biner)', 'HardDrive', { keywords: ['data', 'gb', 'mb'] }),

  // ───────────────────────── Generator & Utility
  t('generator', 'random-number', 'Random Number', 'Angka acak dengan rentang & jumlah', 'Dices', { keywords: ['acak'] }),
  t('generator', 'random-name-picker', 'Random Name Picker', 'Pilih nama acak dari daftar', 'Users', { keywords: ['undian', 'giliran'] }),
  t('generator', 'color-picker', 'Color Picker', 'Ambil warna, lihat HEX/RGB/HSL', 'Pipette', { keywords: ['warna'] }),
  t('generator', 'hex-rgb', 'HEX ↔ RGB', 'Konversi HEX, RGB, dan HSL', 'Palette', { keywords: ['warna', 'hsl'] }),
  t('generator', 'gradient-generator', 'Gradient Generator', 'Buat CSS gradient + preview', 'Blend', { keywords: ['css', 'warna'] }),
  t('generator', 'lorem-ipsum', 'Lorem Ipsum', 'Teks placeholder paragraf/kalimat/kata', 'AlignLeft', { keywords: ['placeholder', 'dummy'] }),
  t('generator', 'qr-contact', 'QR Contact', 'QR kontak (vCard) siap di-scan', 'Contact', { premium: true, keywords: ['vcard', 'kontak'] }),
  t('generator', 'barcode', 'Barcode', 'Code128, EAN, UPC, Code39, ITF', 'Barcode', { premium: true, keywords: ['ean', 'upc'] }),
  t('generator', 'about-me', 'About Me', 'Bikin kartu data diri terminal, isi & download', 'User', { keywords: ['about me', 'data diri'] }),
  t('generator', 'meme-generator', 'Meme Generator', 'Tambah teks atas/bawah ke gambar', 'Smile', { premium: true, keywords: ['meme'] }),
  t('generator', 'universal-converter', 'Universal Converter', 'Konversi 10+ jenis satuan', 'Repeat', { premium: true, keywords: ['satuan', 'unit'] }),
];

// ──────────────────────────────────────────────────────────── helpers

const bySlug = new Map(TOOLS.map((x) => [x.slug, x]));

export function getTool(slug: string): ToolMeta | undefined {
  return bySlug.get(slug);
}

export function getCategory(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function toolsInCategory(id: CategoryId): ToolMeta[] {
  return TOOLS.filter((x) => x.category === id);
}

export interface ToolOverride {
  is_premium: boolean;
  is_enabled: boolean;
}

export function resolveTool(meta: ToolMeta, override?: ToolOverride | null): ResolvedTool {
  return {
    ...meta,
    // Tool native tidak pernah premium-gated: halaman hanya menjelaskan fitur Android.
    isPremium: meta.native ? false : override ? override.is_premium : Boolean(meta.premium),
    isEnabled: override ? override.is_enabled : true,
  };
}

export function resolveAll(overrides: Record<string, ToolOverride>): ResolvedTool[] {
  return TOOLS.map((m) => resolveTool(m, overrides[m.slug])).filter((x) => x.isEnabled);
}

/** Pencarian sederhana dengan skor: nama > keyword > deskripsi > kategori. */
export function searchTools<T extends ToolMeta>(list: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const terms = q.split(/\s+/).filter(Boolean);
  const scored: { tool: T; score: number }[] = [];
  for (const tool of list) {
    const name = tool.name.toLowerCase();
    const desc = tool.description.toLowerCase();
    const cat = getCategory(tool.category).label.toLowerCase();
    const kws = (tool.keywords ?? []).join(' ').toLowerCase();
    let total = 0;
    let ok = true;
    for (const term of terms) {
      let s = 0;
      if (name === term) s = 100;
      else if (name.startsWith(term)) s = 60;
      else if (name.includes(term)) s = 40;
      else if (tool.slug.includes(term)) s = 35;
      else if (kws.includes(term)) s = 25;
      else if (desc.includes(term)) s = 12;
      else if (cat.includes(term)) s = 6;
      if (s === 0) {
        ok = false;
        break;
      }
      total += s;
    }
    if (ok) scored.push({ tool, score: total });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.tool);
}
