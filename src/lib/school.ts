// Logika akademik murni: rata-rata berbobot, nilai akhir, konversi nilai, IPK.

export interface ScoreItem {
  score: number;
  weight: number;
}

export function weightedAverage(items: ScoreItem[]): number | null {
  const totalW = items.reduce((a, b) => a + b.weight, 0);
  if (totalW <= 0) return null;
  return items.reduce((a, b) => a + b.score * b.weight, 0) / totalW;
}

/**
 * Nilai yang dibutuhkan pada komponen terakhir agar nilai akhir mencapai `target`.
 * known: komponen yang sudah ada; lastWeight: bobot komponen terakhir (bobot total = Σ known + lastWeight).
 */
export function neededScore(known: ScoreItem[], lastWeight: number, target: number): number | null {
  const totalW = known.reduce((a, b) => a + b.weight, 0) + lastWeight;
  if (lastWeight <= 0 || totalW <= 0) return null;
  const sum = known.reduce((a, b) => a + b.score * b.weight, 0);
  return (target * totalW - sum) / lastWeight;
}

export interface GradeBand {
  letter: string;
  min: number;
  point: number;
  label: string;
}

/** Skala umum perguruan tinggi di Indonesia — tiap kampus/sekolah bisa berbeda. */
export const GRADE_SCALE: GradeBand[] = [
  { letter: 'A', min: 85, point: 4.0, label: 'Istimewa' },
  { letter: 'A-', min: 80, point: 3.7, label: 'Sangat baik' },
  { letter: 'B+', min: 75, point: 3.3, label: 'Baik' },
  { letter: 'B', min: 70, point: 3.0, label: 'Baik' },
  { letter: 'B-', min: 65, point: 2.7, label: 'Cukup baik' },
  { letter: 'C+', min: 60, point: 2.3, label: 'Cukup' },
  { letter: 'C', min: 55, point: 2.0, label: 'Cukup' },
  { letter: 'D', min: 40, point: 1.0, label: 'Kurang' },
  { letter: 'E', min: 0, point: 0, label: 'Gagal' },
];

export function bandFromScore(score: number): GradeBand {
  const s = Math.min(Math.max(score, 0), 100);
  return GRADE_SCALE.find((b) => s >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}

export function bandFromLetter(letter: string): GradeBand | null {
  const l = letter.trim().toUpperCase();
  return GRADE_SCALE.find((b) => b.letter === l) ?? null;
}

/** Skala 4.0 → band terdekat (pembulatan ke bawah ke batas poin). */
export function bandFromPoint(point: number): GradeBand {
  const p = Math.min(Math.max(point, 0), 4);
  return GRADE_SCALE.find((b) => p >= b.point - 1e-9) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}

export interface Course {
  credits: number;
  point: number;
}

export function computeGpa(courses: Course[]): { gpa: number; credits: number } | null {
  const credits = courses.reduce((a, b) => a + b.credits, 0);
  if (credits <= 0) return null;
  return { gpa: courses.reduce((a, b) => a + b.credits * b.point, 0) / credits, credits };
}

/** IPK kumulatif gabungan dari IPK/SKS sebelumnya dan semester ini. */
export function cumulativeGpa(prevGpa: number, prevCredits: number, term: { gpa: number; credits: number }): number | null {
  const total = prevCredits + term.credits;
  if (total <= 0) return null;
  return (prevGpa * prevCredits + term.gpa * term.credits) / total;
}

export function gpaPredicate(gpa: number): string {
  if (gpa >= 3.51) return 'Cum laude (dengan pujian)';
  if (gpa >= 3.0) return 'Sangat memuaskan';
  if (gpa >= 2.5) return 'Memuaskan';
  if (gpa >= 2.0) return 'Cukup';
  return 'Di bawah standar kelulusan umum';
}
