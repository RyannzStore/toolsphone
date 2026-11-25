export type DiffOp = { type: 'eq' | 'add' | 'del'; text: string };

export interface DiffResult {
  ops: DiffOp[];
  added: number;
  removed: number;
  unchanged: number;
  approximate: boolean;
}

/**
 * Diff berbasis LCS per baris. `normalize` (opsional) dipakai hanya untuk membandingkan
 * (mis. abaikan huruf besar/spasi); teks yang ditampilkan tetap versi aslinya.
 * Untuk input sangat besar jatuh ke mode perkiraan.
 */
export function diffLines(a: string[], b: string[], normalize?: (line: string) => string): DiffResult {
  const na = normalize ? a.map(normalize) : a;
  const nb = normalize ? b.map(normalize) : b;
  let s = 0;
  while (s < a.length && s < b.length && na[s] === nb[s]) s++;
  let ea = a.length;
  let eb = b.length;
  while (ea > s && eb > s && na[ea - 1] === nb[eb - 1]) {
    ea--;
    eb--;
  }
  const A = a.slice(s, ea);
  const B = b.slice(s, eb);
  const KA = na.slice(s, ea);
  const KB = nb.slice(s, eb);
  const n = A.length;
  const m = B.length;

  const ops: DiffOp[] = [];
  for (let i = 0; i < s; i++) ops.push({ type: 'eq', text: b[i] });

  let approximate = false;
  if (n * m > 4000000) {
    approximate = true;
    for (const t of A) ops.push({ type: 'del', text: t });
    for (const t of B) ops.push({ type: 'add', text: t });
  } else {
    const dp: Uint32Array[] = [];
    for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = KA[i] === KB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (KA[i] === KB[j]) {
        ops.push({ type: 'eq', text: B[j] });
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        ops.push({ type: 'del', text: A[i] });
        i++;
      } else {
        ops.push({ type: 'add', text: B[j] });
        j++;
      }
    }
    while (i < n) ops.push({ type: 'del', text: A[i++] });
    while (j < m) ops.push({ type: 'add', text: B[j++] });
  }

  for (let i = eb; i < b.length; i++) ops.push({ type: 'eq', text: b[i] });

  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const op of ops) {
    if (op.type === 'add') added++;
    else if (op.type === 'del') removed++;
    else unchanged++;
  }
  return { ops, added, removed, unchanged, approximate };
}
