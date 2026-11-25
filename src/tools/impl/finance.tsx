'use client';

import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  applyDiscount, dailyBudget, discountPlusTax, installmentAnnuity, installmentFlat, monthlyNeeded, monthsToReach,
  futureValue, percentChange, profitLoss, sellFromMargin, sellFromMarkup, splitBill, tieredDiscount,
} from '@/lib/finance';
import {
  Card, CopyButton, KeyValue, Notice, NumField, Row, Segmented, Stat, StatGrid, TextField, fmtNum, fmtRp, parseNum,
} from '@/components/tools/ui';

const pct = (n: number | null, d = 2) => (n === null ? '—' : `${fmtNum(n, d)}%`);

// ─────────────────────────── Split Bill

function SplitBill() {
  const [sub, setSub] = useState('');
  const [service, setService] = useState('0');
  const [tax, setTax] = useState('10');
  const [tip, setTip] = useState('0');
  const [people, setPeople] = useState('2');
  const [round, setRound] = useState('1000');

  const r = useMemo(() => {
    const s = parseNum(sub);
    const p = parseNum(people);
    if (s === null || s < 0 || p === null || p < 1 || !Number.isInteger(p)) return null;
    return splitBill(s, parseNum(service) ?? 0, parseNum(tax) ?? 0, parseNum(tip) ?? 0, p, parseNum(round) ?? 1);
  }, [sub, service, tax, tip, people, round]);

  const text = r
    ? `Total ${fmtRp(r.total)} dibagi ${people} orang = ${fmtRp(r.perPersonRounded)} per orang`
    : '';

  return (
    <Card>
      <Row>
        <NumField label="Subtotal (Rp)" value={sub} onChange={setSub} placeholder="250000" />
        <NumField label="Jumlah orang" value={people} onChange={setPeople} />
        <NumField label="Service charge" value={service} onChange={setService} suffix="%" />
        <NumField label="Pajak" value={tax} onChange={setTax} suffix="%" hint="Dihitung dari subtotal + service." />
        <NumField label="Tip / biaya lain (Rp)" value={tip} onChange={setTip} />
        <NumField label="Bulatkan ke atas per orang" value={round} onChange={setRound} hint="Isi 1 untuk tanpa pembulatan." />
      </Row>
      {r ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Total tagihan" value={fmtRp(r.total)} />
            <Stat label="Per orang" value={fmtRp(r.perPersonRounded)} accent sub={r.perPersonRounded !== r.perPerson ? `Sebelum pembulatan ${fmtRp(r.perPerson)}` : undefined} />
            <Stat label="Terkumpul" value={fmtRp(r.totalCollected)} sub={r.surplus > 0 ? `Lebih ${fmtRp(r.surplus)}` : undefined} />
          </StatGrid>
          <KeyValue rows={[['Subtotal', fmtRp(r.subtotal)], ['Service', fmtRp(r.service)], ['Pajak', fmtRp(r.tax)], ['Tip / lain', fmtRp(r.tip)]]} />
          <CopyButton text={text} label="Salin ringkasan" />
        </>
      ) : (
        <Notice>Isi subtotal dan jumlah orang (bilangan bulat ≥ 1).</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Daily Budget

function DailyBudget() {
  const [budget, setBudget] = useState('');
  const [spent, setSpent] = useState('0');
  const [days, setDays] = useState('30');
  const [save, setSave] = useState('0');

  const b = parseNum(budget);
  const d = parseNum(days);
  const r = b !== null && d !== null && d > 0 ? dailyBudget(b, parseNum(spent) ?? 0, d, parseNum(save) ?? 0) : null;

  return (
    <Card>
      <Row>
        <NumField label="Total anggaran (Rp)" value={budget} onChange={setBudget} placeholder="3000000" />
        <NumField label="Sudah terpakai (Rp)" value={spent} onChange={setSpent} />
        <NumField label="Sisa hari" value={days} onChange={setDays} />
        <NumField label="Target ditabung (Rp)" value={save} onChange={setSave} />
      </Row>
      {r ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Tersedia" value={fmtRp(r.available)} />
            <Stat label="Per hari" value={fmtRp(r.perDay)} accent />
            <Stat label="Per minggu" value={fmtRp(r.perWeek)} />
          </StatGrid>
          {r.available < 0 ? <Notice kind="warn">Anggaran sudah terlampaui sebesar {fmtRp(-r.available)}.</Notice> : null}
        </>
      ) : (
        <Notice>Isi total anggaran dan sisa hari (&gt; 0).</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Savings Target

function SavingsTarget() {
  const [mode, setMode] = useState<'monthly' | 'time' | 'future'>('monthly');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [months, setMonths] = useState('12');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('0');

  const t = parseNum(target);
  const cur = parseNum(current) ?? 0;
  const rt = parseNum(rate) ?? 0;
  const m = parseNum(months);
  const mo = parseNum(monthly);

  let result: ReactNode = <Notice>Lengkapi isian di atas.</Notice>;
  if (mode === 'monthly' && t !== null && m !== null && m > 0) {
    const need = monthlyNeeded(t, cur, m, rt);
    result = (
      <StatGrid>
        <Stat label="Setoran per bulan" value={fmtRp(need)} accent />
        <Stat label="Total disetor" value={fmtRp(need * m)} />
      </StatGrid>
    );
  } else if (mode === 'time' && t !== null && mo !== null) {
    const n = monthsToReach(t, cur, mo, rt);
    result =
      n === null ? (
        <Notice kind="warn">Target tidak akan tercapai dalam 100 tahun dengan setoran ini.</Notice>
      ) : (
        <StatGrid>
          <Stat label="Waktu tercapai" value={`${n} bulan`} accent sub={n >= 12 ? `${Math.floor(n / 12)} tahun ${n % 12} bulan` : undefined} />
        </StatGrid>
      );
  } else if (mode === 'future' && m !== null && m > 0 && mo !== null) {
    const fv = futureValue(cur, mo, m, rt);
    result = (
      <StatGrid>
        <Stat label="Saldo akhir" value={fmtRp(fv)} accent />
        <Stat label="Total disetor" value={fmtRp(cur + mo * m)} />
      </StatGrid>
    );
  }

  return (
    <Card>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'monthly', label: 'Setoran dibutuhkan' },
          { value: 'time', label: 'Lama menabung' },
          { value: 'future', label: 'Saldo akhir' },
        ]}
      />
      <Row>
        {mode !== 'future' ? <NumField label="Target (Rp)" value={target} onChange={setTarget} placeholder="10000000" /> : null}
        <NumField label="Tabungan saat ini (Rp)" value={current} onChange={setCurrent} />
        {mode !== 'time' ? <NumField label="Jangka waktu (bulan)" value={months} onChange={setMonths} /> : null}
        {mode !== 'monthly' ? <NumField label="Setoran per bulan (Rp)" value={monthly} onChange={setMonthly} /> : null}
        <NumField label="Bunga per tahun" value={rate} onChange={setRate} suffix="%" hint="Isi 0 bila tanpa bunga." />
      </Row>
      {result}
      <p className="text-xs text-zinc-500">Setoran dianggap masuk di akhir tiap bulan, bunga majemuk bulanan. Estimasi, bukan jaminan hasil.</p>
    </Card>
  );
}

// ─────────────────────────── Installment

function Installment() {
  const [price, setPrice] = useState('');
  const [dp, setDp] = useState('0');
  const [rate, setRate] = useState('12');
  const [months, setMonths] = useState('12');
  const [method, setMethod] = useState<'flat' | 'annuity'>('flat');
  const [showTable, setShowTable] = useState(false);

  const p = parseNum(price);
  const n = parseNum(months);
  const principal = p !== null ? p - (parseNum(dp) ?? 0) : null;
  const r =
    principal !== null && principal > 0 && n !== null && n >= 1 && Number.isInteger(n) && n <= 600
      ? (method === 'flat' ? installmentFlat : installmentAnnuity)(principal, parseNum(rate) ?? 0, n)
      : null;

  return (
    <Card>
      <Segmented
        value={method}
        onChange={setMethod}
        label="Metode bunga"
        options={[
          { value: 'flat', label: 'Flat' },
          { value: 'annuity', label: 'Efektif (anuitas)' },
        ]}
      />
      <Row>
        <NumField label="Harga / pinjaman (Rp)" value={price} onChange={setPrice} placeholder="12000000" />
        <NumField label="Uang muka / DP (Rp)" value={dp} onChange={setDp} />
        <NumField label="Bunga per tahun" value={rate} onChange={setRate} suffix="%" />
        <NumField label="Tenor (bulan)" value={months} onChange={setMonths} hint="Bilangan bulat, maks 600." />
      </Row>
      {r ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Cicilan / bulan" value={fmtRp(r.monthly)} accent />
            <Stat label="Total bayar" value={fmtRp(r.totalPaid)} />
            <Stat label="Total bunga" value={fmtRp(r.totalInterest)} />
          </StatGrid>
          <button type="button" className="btn btn-sm" onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Sembunyikan' : 'Tampilkan'} tabel angsuran
          </button>
          {showTable ? (
            <div className="max-h-80 overflow-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[460px] text-right text-sm tabular-nums">
                <thead className="sticky top-0 bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    {['Bln', 'Cicilan', 'Pokok', 'Bunga', 'Sisa'].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {r.rows.map((row) => (
                    <tr key={row.n}>
                      <td className="px-3 py-1.5 text-left text-zinc-400">{row.n}</td>
                      <td className="px-3 py-1.5">{fmtRp(row.payment)}</td>
                      <td className="px-3 py-1.5">{fmtRp(row.principal)}</td>
                      <td className="px-3 py-1.5">{fmtRp(row.interest)}</td>
                      <td className="px-3 py-1.5">{fmtRp(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <Notice>Isi harga (lebih besar dari DP) dan tenor.</Notice>
      )}
      <p className="text-xs text-zinc-500">Perhitungan simulasi; biaya admin, asuransi, dan denda dari penyedia kredit tidak termasuk.</p>
    </Card>
  );
}

// ─────────────────────────── Discount + Tax

function DiscountTax() {
  const [price, setPrice] = useState('');
  const [disc, setDisc] = useState('10');
  const [tax, setTax] = useState('11');
  const [base, setBase] = useState<'after' | 'before'>('after');

  const p = parseNum(price);
  const r = p !== null ? discountPlusTax(p, parseNum(disc) ?? 0, parseNum(tax) ?? 0, base) : null;

  return (
    <Card>
      <Row>
        <NumField label="Harga awal (Rp)" value={price} onChange={setPrice} placeholder="500000" />
        <NumField label="Diskon" value={disc} onChange={setDisc} suffix="%" />
        <NumField label="Pajak" value={tax} onChange={setTax} suffix="%" />
      </Row>
      <Segmented
        value={base}
        onChange={setBase}
        label="Pajak dihitung dari"
        options={[
          { value: 'after', label: 'Harga setelah diskon' },
          { value: 'before', label: 'Harga awal' },
        ]}
      />
      {r ? (
        <>
          <StatGrid cols={4}>
            <Stat label="Hemat" value={fmtRp(r.discount)} />
            <Stat label="Setelah diskon" value={fmtRp(r.afterDiscount)} />
            <Stat label="Pajak" value={fmtRp(r.tax)} />
            <Stat label="Total" value={fmtRp(r.total)} accent />
          </StatGrid>
          <CopyButton text={fmtRp(r.total)} label="Salin total" />
        </>
      ) : (
        <Notice>Isi harga awal.</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Profit / Loss

function ProfitLoss() {
  const [mode, setMode] = useState<'result' | 'markup' | 'margin'>('result');
  const [cost, setCost] = useState('');
  const [sell, setSell] = useState('');
  const [target, setTarget] = useState('20');

  const c = parseNum(cost);
  const s = parseNum(sell);
  const tg = parseNum(target);

  let body: ReactNode = <Notice>Lengkapi isian di atas.</Notice>;
  if (mode === 'result' && c !== null && s !== null) {
    const r = profitLoss(c, s);
    body = (
      <>
        <StatGrid cols={3}>
          <Stat label={r.isProfit ? 'Untung' : r.isLoss ? 'Rugi' : 'Impas'} value={fmtRp(Math.abs(r.diff))} accent={r.isProfit} />
          <Stat label="Terhadap modal (markup)" value={pct(r.markupPct)} />
          <Stat label="Terhadap harga jual (margin)" value={pct(r.marginPct)} />
        </StatGrid>
        {r.isLoss ? <Notice kind="warn">Harga jual di bawah modal.</Notice> : null}
      </>
    );
  } else if (mode === 'markup' && c !== null && tg !== null) {
    const price = sellFromMarkup(c, tg);
    body = (
      <StatGrid>
        <Stat label="Harga jual" value={fmtRp(price)} accent />
        <Stat label="Laba per unit" value={fmtRp(price - c)} />
      </StatGrid>
    );
  } else if (mode === 'margin' && c !== null && tg !== null) {
    const price = sellFromMargin(c, tg);
    body =
      price === null ? (
        <Notice kind="error">Margin harus kurang dari 100%.</Notice>
      ) : (
        <StatGrid>
          <Stat label="Harga jual" value={fmtRp(price)} accent />
          <Stat label="Laba per unit" value={fmtRp(price - c)} />
        </StatGrid>
      );
  }

  return (
    <Card>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'result', label: 'Hitung untung/rugi' },
          { value: 'markup', label: 'Target markup' },
          { value: 'margin', label: 'Target margin' },
        ]}
      />
      <Row>
        <NumField label="Modal / harga beli (Rp)" value={cost} onChange={setCost} />
        {mode === 'result' ? (
          <NumField label="Harga jual (Rp)" value={sell} onChange={setSell} />
        ) : (
          <NumField label={mode === 'markup' ? 'Target markup' : 'Target margin'} value={target} onChange={setTarget} suffix="%" />
        )}
      </Row>
      {body}
      <p className="text-xs text-zinc-500">Markup = laba ÷ modal. Margin = laba ÷ harga jual.</p>
    </Card>
  );
}

// ─────────────────────────── Price After Discount

function PriceAfterDiscount() {
  const [price, setPrice] = useState('');
  const [list, setList] = useState('20, 10');

  const p = parseNum(price);
  const parts = list.split(/[,;\s]+/).filter(Boolean).map((x) => parseNum(x));
  const bad = parts.some((x) => x === null);
  const pcts = parts.filter((x): x is number => x !== null);
  const r = p !== null && !bad && pcts.length > 0 ? tieredDiscount(p, pcts) : null;
  const single = p !== null && pcts.length === 1 ? applyDiscount(p, pcts[0]) : null;

  return (
    <Card>
      <Row>
        <NumField label="Harga awal (Rp)" value={price} onChange={setPrice} placeholder="1000000" />
        <TextField label="Diskon (%)" value={list} onChange={setList} hint="Satu atau beberapa, pisah koma. Contoh 20, 10 = diskon bertingkat." />
      </Row>
      {bad ? <Notice kind="error">Ada diskon yang bukan angka.</Notice> : null}
      {r ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Harga akhir" value={fmtRp(r.final)} accent />
            <Stat label="Total hemat" value={fmtRp(single ? single.discount : r.totalDiscount)} />
            <Stat label="Diskon efektif" value={pct(r.effectivePct)} />
          </StatGrid>
          {r.steps.length > 1 ? (
            <KeyValue rows={r.steps.map((s, i) => [`Diskon ${i + 1} (${fmtNum(s.pct)}%)`, `−${fmtRp(s.amount)} → ${fmtRp(s.after)}`])} />
          ) : null}
        </>
      ) : !bad ? (
        <Notice>Isi harga awal dan minimal satu diskon.</Notice>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Percentage Increase / Decrease

function PercentChange({ direction }: { direction: 'increase' | 'decrease' }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [byPct, setByPct] = useState('');
  const up = direction === 'increase';

  const f = parseNum(from);
  const t = parseNum(to);
  const b = parseNum(byPct);
  const change = f !== null && t !== null ? percentChange(f, t) : null;
  const applied = f !== null && b !== null ? f * (1 + (up ? b : -b) / 100) : null;

  return (
    <div className="space-y-4">
      <Card title={`Hitung persentase ${up ? 'kenaikan' : 'penurunan'}`}>
        <Row>
          <NumField label="Nilai awal" value={from} onChange={setFrom} />
          <NumField label="Nilai akhir" value={to} onChange={setTo} />
        </Row>
        {f !== null && t !== null ? (
          change === null ? (
            <Notice kind="error">Nilai awal 0 — persentase tidak terdefinisi.</Notice>
          ) : (
            <>
              <StatGrid>
                <Stat label="Perubahan" value={`${change > 0 ? '+' : ''}${pct(change)}`} accent />
                <Stat label="Selisih" value={fmtNum(t - f, 4)} />
              </StatGrid>
              {(up && change < 0) || (!up && change > 0) ? (
                <Notice kind="warn">Nilai ini sebenarnya {change < 0 ? 'turun' : 'naik'}.</Notice>
              ) : null}
            </>
          )
        ) : null}
      </Card>
      <Card title={`Terapkan ${up ? 'kenaikan' : 'penurunan'} persen`}>
        <Row>
          <NumField label="Nilai awal" value={from} onChange={setFrom} />
          <NumField label={up ? 'Naik sebesar' : 'Turun sebesar'} value={byPct} onChange={setByPct} suffix="%" />
        </Row>
        {applied !== null ? <Stat label="Hasil" value={fmtNum(applied, 4)} accent /> : null}
      </Card>
    </div>
  );
}

const tools: Record<string, ComponentType> = {
  'split-bill': SplitBill,
  'daily-budget': DailyBudget,
  'savings-target': SavingsTarget,
  'installment-calculator': Installment,
  'discount-tax': DiscountTax,
  'profit-loss': ProfitLoss,
  'price-after-discount': PriceAfterDiscount,
  'percentage-increase': () => <PercentChange direction="increase" />,
  'percentage-decrease': () => <PercentChange direction="decrease" />,
};

export default tools;
