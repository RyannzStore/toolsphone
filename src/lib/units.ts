// Data satuan untuk semua converter (length, weight, storage, universal).
// factor = nilai dalam satuan dasar kategori untuk 1 unit tersebut.

export interface UnitDef {
  id: string;
  label: string;
  factor: number;
}

export interface UnitCategory {
  id: string;
  label: string;
  units: UnitDef[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    label: 'Panjang',
    units: [
      { id: 'mm', label: 'Milimeter (mm)', factor: 0.001 },
      { id: 'cm', label: 'Sentimeter (cm)', factor: 0.01 },
      { id: 'm', label: 'Meter (m)', factor: 1 },
      { id: 'km', label: 'Kilometer (km)', factor: 1000 },
      { id: 'in', label: 'Inci (in)', factor: 0.0254 },
      { id: 'ft', label: 'Kaki (ft)', factor: 0.3048 },
      { id: 'yd', label: 'Yard (yd)', factor: 0.9144 },
      { id: 'mi', label: 'Mil (mi)', factor: 1609.344 },
      { id: 'nmi', label: 'Mil laut (nmi)', factor: 1852 },
    ],
  },
  {
    id: 'mass',
    label: 'Berat / Massa',
    units: [
      { id: 'mg', label: 'Miligram (mg)', factor: 0.000001 },
      { id: 'g', label: 'Gram (g)', factor: 0.001 },
      { id: 'ons', label: 'Ons (100 g)', factor: 0.1 },
      { id: 'kg', label: 'Kilogram (kg)', factor: 1 },
      { id: 'kw', label: 'Kuintal (100 kg)', factor: 100 },
      { id: 't', label: 'Ton metrik (t)', factor: 1000 },
      { id: 'oz', label: 'Ons AS (oz)', factor: 0.028349523125 },
      { id: 'lb', label: 'Pound (lb)', factor: 0.45359237 },
    ],
  },
  {
    id: 'area',
    label: 'Luas',
    units: [
      { id: 'mm2', label: 'mm²', factor: 0.000001 },
      { id: 'cm2', label: 'cm²', factor: 0.0001 },
      { id: 'm2', label: 'm²', factor: 1 },
      { id: 'km2', label: 'km²', factor: 1000000 },
      { id: 'ha', label: 'Hektare (ha)', factor: 10000 },
      { id: 'in2', label: 'in²', factor: 0.00064516 },
      { id: 'ft2', label: 'ft²', factor: 0.09290304 },
      { id: 'yd2', label: 'yd²', factor: 0.83612736 },
      { id: 'ac', label: 'Acre', factor: 4046.8564224 },
      { id: 'mi2', label: 'mi²', factor: 2589988.110336 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    units: [
      { id: 'ml', label: 'Mililiter (mL)', factor: 0.001 },
      { id: 'l', label: 'Liter (L)', factor: 1 },
      { id: 'm3', label: 'm³', factor: 1000 },
      { id: 'tsp', label: 'Sendok teh AS (tsp)', factor: 0.00492892159375 },
      { id: 'tbsp', label: 'Sendok makan AS (tbsp)', factor: 0.01478676478125 },
      { id: 'floz', label: 'Fluid ounce AS', factor: 0.0295735295625 },
      { id: 'cup', label: 'Cup AS', factor: 0.2365882365 },
      { id: 'pt', label: 'Pint AS', factor: 0.473176473 },
      { id: 'qt', label: 'Quart AS', factor: 0.946352946 },
      { id: 'gal', label: 'Galon AS', factor: 3.785411784 },
    ],
  },
  {
    id: 'speed',
    label: 'Kecepatan',
    units: [
      { id: 'ms', label: 'm/s', factor: 1 },
      { id: 'kmh', label: 'km/jam', factor: 1 / 3.6 },
      { id: 'mph', label: 'mil/jam (mph)', factor: 0.44704 },
      { id: 'kn', label: 'Knot', factor: 1852 / 3600 },
      { id: 'fts', label: 'ft/s', factor: 0.3048 },
    ],
  },
  {
    id: 'time',
    label: 'Waktu',
    units: [
      { id: 'ms', label: 'Milidetik', factor: 0.001 },
      { id: 's', label: 'Detik', factor: 1 },
      { id: 'min', label: 'Menit', factor: 60 },
      { id: 'h', label: 'Jam', factor: 3600 },
      { id: 'd', label: 'Hari', factor: 86400 },
      { id: 'w', label: 'Minggu', factor: 604800 },
      { id: 'mo', label: 'Bulan (30 hari)', factor: 2592000 },
      { id: 'y', label: 'Tahun (365 hari)', factor: 31536000 },
    ],
  },
  {
    id: 'data',
    label: 'Penyimpanan Data',
    units: [
      { id: 'bit', label: 'Bit', factor: 0.125 },
      { id: 'B', label: 'Byte (B)', factor: 1 },
      { id: 'KB', label: 'Kilobyte (KB = 1000 B)', factor: 1e3 },
      { id: 'MB', label: 'Megabyte (MB = 1000² B)', factor: 1e6 },
      { id: 'GB', label: 'Gigabyte (GB = 1000³ B)', factor: 1e9 },
      { id: 'TB', label: 'Terabyte (TB = 1000⁴ B)', factor: 1e12 },
      { id: 'PB', label: 'Petabyte (PB = 1000⁵ B)', factor: 1e15 },
      { id: 'KiB', label: 'Kibibyte (KiB = 1024 B)', factor: 1024 },
      { id: 'MiB', label: 'Mebibyte (MiB = 1024² B)', factor: 1024 ** 2 },
      { id: 'GiB', label: 'Gibibyte (GiB = 1024³ B)', factor: 1024 ** 3 },
      { id: 'TiB', label: 'Tebibyte (TiB = 1024⁴ B)', factor: 1024 ** 4 },
      { id: 'PiB', label: 'Pebibyte (PiB = 1024⁵ B)', factor: 1024 ** 5 },
    ],
  },
  {
    id: 'pressure',
    label: 'Tekanan',
    units: [
      { id: 'Pa', label: 'Pascal (Pa)', factor: 1 },
      { id: 'kPa', label: 'Kilopascal (kPa)', factor: 1000 },
      { id: 'bar', label: 'Bar', factor: 100000 },
      { id: 'atm', label: 'Atmosfer (atm)', factor: 101325 },
      { id: 'psi', label: 'PSI', factor: 6894.757293168 },
      { id: 'mmHg', label: 'mmHg', factor: 133.322387415 },
    ],
  },
  {
    id: 'energy',
    label: 'Energi',
    units: [
      { id: 'J', label: 'Joule (J)', factor: 1 },
      { id: 'kJ', label: 'Kilojoule (kJ)', factor: 1000 },
      { id: 'cal', label: 'Kalori (cal)', factor: 4.184 },
      { id: 'kcal', label: 'Kilokalori (kcal)', factor: 4184 },
      { id: 'Wh', label: 'Watt-jam (Wh)', factor: 3600 },
      { id: 'kWh', label: 'Kilowatt-jam (kWh)', factor: 3600000 },
    ],
  },
  {
    id: 'power',
    label: 'Daya',
    units: [
      { id: 'W', label: 'Watt (W)', factor: 1 },
      { id: 'kW', label: 'Kilowatt (kW)', factor: 1000 },
      { id: 'MW', label: 'Megawatt (MW)', factor: 1000000 },
      { id: 'hp', label: 'Tenaga kuda (hp)', factor: 745.69987158227 },
    ],
  },
  {
    id: 'angle',
    label: 'Sudut',
    units: [
      { id: 'deg', label: 'Derajat (°)', factor: 1 },
      { id: 'rad', label: 'Radian (rad)', factor: 180 / Math.PI },
      { id: 'grad', label: 'Gradian (grad)', factor: 0.9 },
      { id: 'turn', label: 'Putaran penuh', factor: 360 },
    ],
  },
];

export function getCategory(id: string): UnitCategory {
  const c = UNIT_CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error('Kategori satuan tidak ditemukan: ' + id);
  return c;
}

export function convertLinear(value: number, from: UnitDef, to: UnitDef): number {
  return (value * from.factor) / to.factor;
}

export type TempUnit = 'C' | 'F' | 'K' | 'R';

export const TEMP_UNITS: { id: TempUnit; label: string }[] = [
  { id: 'C', label: 'Celsius (°C)' },
  { id: 'F', label: 'Fahrenheit (°F)' },
  { id: 'K', label: 'Kelvin (K)' },
  { id: 'R', label: 'Rankine (°R)' },
];

export function convertTemperature(v: number, from: TempUnit, to: TempUnit): number {
  let c: number;
  switch (from) {
    case 'C': c = v; break;
    case 'F': c = ((v - 32) * 5) / 9; break;
    case 'K': c = v - 273.15; break;
    default: c = ((v - 491.67) * 5) / 9; break;
  }
  switch (to) {
    case 'C': return c;
    case 'F': return (c * 9) / 5 + 32;
    case 'K': return c + 273.15;
    default: return ((c + 273.15) * 9) / 5;
  }
}

/** Format angka untuk hasil konversi: hindari noise float, tetap ringkas. */
export function formatConverted(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-6) return n.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e');
  return String(parseFloat(n.toPrecision(10)));
}
