// Rumus keuangan murni (tanpa UI). Semua persen dalam satuan persen (10 = 10%).

export const pctOf = (pct: number, value: number) => (value * pct) / 100;

export function applyDiscount(price: number, pct: number) {
  const discount = pctOf(pct, price);
  return { discount, final: price - discount };
}

/** Diskon bertingkat, mis. [20, 10] → harga × 0.8 × 0.9. */
export function tieredDiscount(price: number, pcts: number[]) {
  let cur = price;
  const steps: { pct: number; amount: number; after: number }[] = [];
  for (const p of pcts) {
    const amount = pctOf(p, cur);
    cur -= amount;
    steps.push({ pct: p, amount, after: cur });
  }
  return { final: cur, totalDiscount: price - cur, effectivePct: price === 0 ? 0 : ((price - cur) / price) * 100, steps };
}

export interface DiscountTaxResult {
  discount: number;
  afterDiscount: number;
  tax: number;
  total: number;
}

export function discountPlusTax(price: number, discPct: number, taxPct: number, taxBase: 'after' | 'before'): DiscountTaxResult {
  const discount = pctOf(discPct, price);
  const afterDiscount = price - discount;
  const tax = pctOf(taxPct, taxBase === 'after' ? afterDiscount : price);
  return { discount, afterDiscount, tax, total: afterDiscount + tax };
}

export function profitLoss(cost: number, sell: number) {
  const diff = sell - cost;
  return {
    diff,
    isProfit: diff > 0,
    isLoss: diff < 0,
    /** persen terhadap modal */
    markupPct: cost === 0 ? null : (diff / cost) * 100,
    /** persen terhadap harga jual */
    marginPct: sell === 0 ? null : (diff / sell) * 100,
  };
}

export function sellFromMarkup(cost: number, markupPct: number) {
  return cost * (1 + markupPct / 100);
}

/** Margin harus < 100%. */
export function sellFromMargin(cost: number, marginPct: number): number | null {
  if (marginPct >= 100) return null;
  return cost / (1 - marginPct / 100);
}

export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

// ───────────────────────────── Cicilan

export interface InstallmentRow {
  n: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface InstallmentResult {
  monthly: number;
  totalPaid: number;
  totalInterest: number;
  rows: InstallmentRow[];
  effectiveNote?: string;
}

/** Bunga flat: bunga = pokok × bunga/tahun × tahun; cicilan tetap = (pokok + bunga) / bulan. */
export function installmentFlat(principal: number, annualPct: number, months: number): InstallmentResult {
  const interestTotal = principal * (annualPct / 100) * (months / 12);
  const monthly = (principal + interestTotal) / months;
  const rows: InstallmentRow[] = [];
  let balance = principal;
  const pPart = principal / months;
  const iPart = interestTotal / months;
  for (let n = 1; n <= months; n++) {
    balance = Math.max(balance - pPart, 0);
    rows.push({ n, payment: monthly, principal: pPart, interest: iPart, balance: n === months ? 0 : balance });
  }
  return { monthly, totalPaid: principal + interestTotal, totalInterest: interestTotal, rows };
}

/** Anuitas (bunga efektif menurun): PMT = P·r / (1 − (1+r)^−n), r = bunga bulanan. */
export function installmentAnnuity(principal: number, annualPct: number, months: number): InstallmentResult {
  const r = annualPct / 100 / 12;
  const monthly = r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
  const rows: InstallmentRow[] = [];
  let balance = principal;
  for (let n = 1; n <= months; n++) {
    const interest = balance * r;
    const princ = monthly - interest;
    balance = n === months ? 0 : Math.max(balance - princ, 0);
    rows.push({ n, payment: monthly, principal: princ, interest, balance });
  }
  const totalPaid = monthly * months;
  return { monthly, totalPaid, totalInterest: totalPaid - principal, rows };
}

// ───────────────────────────── Tabungan

/** Setoran bulanan yang dibutuhkan untuk mencapai target dalam `months` bulan (bunga majemuk bulanan, setoran di akhir bulan). */
export function monthlyNeeded(target: number, current: number, months: number, annualPct: number): number {
  const r = annualPct / 100 / 12;
  if (r === 0) return Math.max(target - current, 0) / months;
  const growth = (1 + r) ** months;
  const need = target - current * growth;
  if (need <= 0) return 0;
  return (need * r) / (growth - 1);
}

/** Berapa bulan untuk mencapai target dengan setoran tetap. null jika tidak akan tercapai (≤ 100 tahun). */
export function monthsToReach(target: number, current: number, monthly: number, annualPct: number): number | null {
  if (current >= target) return 0;
  const r = annualPct / 100 / 12;
  if (monthly <= 0 && r === 0) return null;
  let bal = current;
  for (let m = 1; m <= 1200; m++) {
    bal = bal * (1 + r) + monthly;
    if (bal >= target) return m;
  }
  return null;
}

export function futureValue(current: number, monthly: number, months: number, annualPct: number): number {
  const r = annualPct / 100 / 12;
  let bal = current;
  for (let m = 0; m < months; m++) bal = bal * (1 + r) + monthly;
  return bal;
}

// ───────────────────────────── Patungan

export interface SplitResult {
  subtotal: number;
  service: number;
  tax: number;
  tip: number;
  total: number;
  perPerson: number;
  /** per orang setelah dibulatkan ke atas */
  perPersonRounded: number;
  totalCollected: number;
  surplus: number;
}

export function splitBill(subtotal: number, servicePct: number, taxPct: number, tip: number, people: number, roundTo: number): SplitResult {
  const service = pctOf(servicePct, subtotal);
  // Konvensi umum di Indonesia: pajak dihitung dari subtotal + service charge
  const tax = pctOf(taxPct, subtotal + service);
  const total = subtotal + service + tax + tip;
  const perPerson = total / people;
  const perPersonRounded = roundTo > 1 ? Math.ceil(perPerson / roundTo - 1e-9) * roundTo : perPerson;
  const totalCollected = perPersonRounded * people;
  return { subtotal, service, tax, tip, total, perPerson, perPersonRounded, totalCollected, surplus: totalCollected - total };
}

export function dailyBudget(budget: number, spent: number, days: number, saveGoal: number) {
  const available = budget - spent - saveGoal;
  return { available, perDay: days > 0 ? available / days : 0, perWeek: days > 0 ? (available / days) * 7 : 0 };
}
