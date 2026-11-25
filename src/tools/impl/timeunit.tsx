'use client';

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { ArrowLeftRight, Flag, Pause, Play, RotateCcw } from 'lucide-react';
import {
  addDays, businessDays, calendarSpan, compareYmd, daysBetween, formatYmd, nextBirthday, parseYmd, splitDuration,
  todayYmd, weekdayName, type YMD,
} from '@/lib/datetime';
import { TEMP_UNITS, convertLinear, convertTemperature, formatConverted, getCategory, type TempUnit } from '@/lib/units';
import {
  Actions, Card, CopyButton, KeyValue, Notice, NumField, Row, SelectField, Stat, StatGrid, TextField, parseNum,
} from '@/components/tools/ui';
import { cn } from '@/lib/utils';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    osc.onended = () => void ctx.close();
  } catch {
    /* abaikan */
  }
}

// ─────────────────────────── Stopwatch

function fmtStopwatch(ms: number) {
  const t = Math.max(0, Math.floor(ms));
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  return `${h > 0 ? `${h}:` : ''}${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const startedAt = useRef(0);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      setElapsed(base.current + (performance.now() - startedAt.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const toggle = () => {
    if (running) {
      base.current += performance.now() - startedAt.current;
      setElapsed(base.current);
      setRunning(false);
    } else {
      startedAt.current = performance.now();
      setRunning(true);
    }
  };
  const lap = () => setLaps((l) => [...l, running ? base.current + (performance.now() - startedAt.current) : elapsed]);
  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    base.current = 0;
  };

  const rows = laps.map((t, i) => ({ n: i + 1, total: t, split: t - (laps[i - 1] ?? 0) }));
  const best = rows.length > 1 ? Math.min(...rows.map((r) => r.split)) : null;
  const worst = rows.length > 1 ? Math.max(...rows.map((r) => r.split)) : null;

  return (
    <Card>
      <p className="text-center font-heading text-5xl font-semibold tabular-nums text-zinc-50 sm:text-6xl" role="timer" aria-live="off">
        {fmtStopwatch(elapsed)}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={toggle}>
          {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {running ? 'Jeda' : elapsed > 0 ? 'Lanjut' : 'Mulai'}
        </button>
        <button type="button" className="btn" onClick={lap} disabled={elapsed === 0}>
          <Flag size={16} aria-hidden /> Lap
        </button>
        <button type="button" className="btn" onClick={reset} disabled={elapsed === 0 && laps.length === 0}>
          <RotateCcw size={16} aria-hidden /> Reset
        </button>
      </div>
      {rows.length ? (
        <>
          <div className="max-h-64 overflow-auto rounded-xl border border-white/[0.07]">
            <table className="w-full text-right text-sm tabular-nums">
              <thead className="sticky top-0 bg-zinc-900 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Lap</th>
                  <th className="px-3 py-2 font-semibold">Selisih</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {[...rows].reverse().map((r) => (
                  <tr key={r.n}>
                    <td className="px-3 py-1.5 text-left text-zinc-400">{r.n}</td>
                    <td className={cn('px-3 py-1.5', r.split === best && 'text-emerald-300', r.split === worst && 'text-red-300')}>{fmtStopwatch(r.split)}</td>
                    <td className="px-3 py-1.5">{fmtStopwatch(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CopyButton text={rows.map((r) => `Lap ${r.n}: ${fmtStopwatch(r.split)} (total ${fmtStopwatch(r.total)})`).join('\n')} label="Salin lap" />
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Timer

function Timer() {
  const [h, setH] = useState('0');
  const [m, setM] = useState('5');
  const [s, setS] = useState('0');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null); // detik
  const [finished, setFinished] = useState(false);
  const endAt = useRef(0);

  const total = Math.floor((parseNum(h) ?? 0) * 3600 + (parseNum(m) ?? 0) * 60 + (parseNum(s) ?? 0));
  const valid = total > 0 && total <= 99 * 3600;

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = (endAt.current - Date.now()) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        setFinished(true);
        beep();
      } else {
        setRemaining(left);
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    const from = remaining !== null && remaining > 0 ? remaining : total;
    if (from <= 0) return;
    endAt.current = Date.now() + from * 1000;
    setFinished(false);
    setRemaining(from);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(null);
    setFinished(false);
  };
  const preset = (min: number) => {
    reset();
    setH(String(Math.floor(min / 60)));
    setM(String(min % 60));
    setS('0');
  };

  const shown = remaining ?? total;
  const d = splitDuration(Math.ceil(shown));
  const clock = `${pad(d.d * 24 + d.h)}:${pad(d.m)}:${pad(d.s)}`;

  return (
    <Card>
      <p className={cn('text-center font-heading text-6xl font-semibold tabular-nums', finished ? 'text-accent' : 'text-zinc-50')} role="timer" aria-live="off">{clock}</p>
      {finished ? <Notice kind="success">Waktu habis!</Notice> : null}
      {!running && remaining === null ? (
        <>
          <Row className="sm:grid-cols-3">
            <NumField label="Jam" value={h} onChange={setH} />
            <NumField label="Menit" value={m} onChange={setM} />
            <NumField label="Detik" value={s} onChange={setS} />
          </Row>
          <Actions>
            {[1, 5, 10, 15, 30, 60].map((p) => (
              <button key={p} type="button" className="btn btn-sm" onClick={() => preset(p)}>{p >= 60 ? '1 jam' : `${p} mnt`}</button>
            ))}
          </Actions>
        </>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" disabled={!running && remaining === null && !valid} onClick={running ? () => { setRunning(false); } : start}>
          {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {running ? 'Jeda' : remaining !== null && remaining > 0 ? 'Lanjut' : 'Mulai'}
        </button>
        <button type="button" className="btn" onClick={reset}>
          <RotateCcw size={16} aria-hidden /> Reset
        </button>
      </div>
      <p className="text-xs text-zinc-500">Bunyi hanya akan terdengar bila tab tetap terbuka. Maksimal 99 jam.</p>
    </Card>
  );
}

// ─────────────────────────── Countdown (ke tanggal & jam)

function Countdown() {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const t = target ? new Date(target).getTime() : NaN;
  const valid = Number.isFinite(t);
  const diff = valid && now !== null ? (t - now) / 1000 : null;
  const dur = diff !== null ? splitDuration(Math.abs(diff)) : null;

  return (
    <Card>
      <Row>
        <TextField label="Nama acara (opsional)" value={title} onChange={setTitle} placeholder="Liburan" />
        <TextField label="Tanggal & jam tujuan" type="datetime-local" value={target} onChange={setTarget} hint="Memakai zona waktu perangkatmu." />
      </Row>
      {dur && diff !== null ? (
        <>
          {title ? <p className="text-center text-sm font-semibold text-zinc-300">{title}</p> : null}
          <StatGrid cols={4}>
            <Stat label="Hari" value={dur.d} accent />
            <Stat label="Jam" value={pad(dur.h)} />
            <Stat label="Menit" value={pad(dur.m)} />
            <Stat label="Detik" value={pad(dur.s)} />
          </StatGrid>
          <Notice kind={diff >= 0 ? 'info' : 'warn'}>{diff >= 0 ? 'Waktu tersisa menuju tujuan.' : 'Tujuan sudah lewat — angka di atas adalah waktu sejak itu.'}</Notice>
        </>
      ) : (
        <Notice>Pilih tanggal dan jam tujuan.</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Age Calculator

function AgeCalculator() {
  const [birth, setBirth] = useState('');
  const [asOf, setAsOf] = useState('');
  const [today, setToday] = useState<YMD | null>(null);
  useEffect(() => setToday(todayYmd()), []);

  const b = parseYmd(birth);
  const ref = asOf ? parseYmd(asOf) : today;

  let body: ReactNode = <Notice>Pilih tanggal lahir.</Notice>;
  if (birth && !b) body = <Notice kind="error">Tanggal lahir tidak valid.</Notice>;
  else if (b && ref) {
    if (compareYmd(b, ref) > 0) body = <Notice kind="error">Tanggal lahir berada setelah tanggal acuan.</Notice>;
    else {
      const span = calendarSpan(b, ref);
      const days = daysBetween(b, ref);
      const nb = nextBirthday(b, ref);
      body = (
        <>
          <StatGrid cols={3}>
            <Stat label="Usia" value={`${span.years} th`} accent sub={`${span.months} bulan ${span.days} hari`} />
            <Stat label="Total hari" value={days.toLocaleString('id-ID')} sub={`≈ ${(days / 7).toLocaleString('id-ID', { maximumFractionDigits: 0 })} minggu`} />
            <Stat label="Lahir hari" value={weekdayName(b)} />
          </StatGrid>
          <KeyValue
            rows={[
              ['Ulang tahun berikutnya', `${weekdayName(nb.date)}, ${formatYmd(nb.date)}`],
              ['Menuju usia', `${nb.turning} tahun`],
              ['Sisa waktu', nb.daysLeft === 0 ? 'Hari ini! 🎉' : `${nb.daysLeft} hari lagi`],
            ]}
          />
        </>
      );
    }
  }

  return (
    <Card>
      <Row>
        <TextField label="Tanggal lahir" type="date" value={birth} onChange={setBirth} />
        <TextField label="Hitung per tanggal (opsional)" type="date" value={asOf} onChange={setAsOf} hint="Kosongkan untuk hari ini." />
      </Row>
      {body}
    </Card>
  );
}

// ─────────────────────────── Date Difference

function DateDifference() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const pa = parseYmd(a);
  const pb = parseYmd(b);

  let body: ReactNode = <Notice>Pilih dua tanggal.</Notice>;
  if (pa && pb) {
    const [from, to] = compareYmd(pa, pb) <= 0 ? [pa, pb] : [pb, pa];
    const span = calendarSpan(from, to);
    const days = daysBetween(from, to);
    body = (
      <>
        <StatGrid cols={3}>
          <Stat label="Selisih" value={`${span.years} th ${span.months} bln ${span.days} hr`} accent />
          <Stat label="Total hari" value={days.toLocaleString('id-ID')} />
          <Stat label="Total minggu" value={`${Math.floor(days / 7)} mgg ${days % 7} hr`} />
        </StatGrid>
        <KeyValue rows={[['Dari', `${weekdayName(from)}, ${formatYmd(from)}`], ['Sampai', `${weekdayName(to)}, ${formatYmd(to)}`], ['Total bulan', `${span.years * 12 + span.months} bulan ${span.days} hari`]]} />
        {compareYmd(pa, pb) > 0 ? <p className="text-xs text-zinc-500">Tanggal pertama lebih akhir, urutan ditukar otomatis.</p> : null}
      </>
    );
  }

  return (
    <Card>
      <Row>
        <TextField label="Tanggal pertama" type="date" value={a} onChange={setA} />
        <TextField label="Tanggal kedua" type="date" value={b} onChange={setB} />
      </Row>
      {body}
    </Card>
  );
}

// ─────────────────────────── Days Between Dates (+ hari kerja, tambah hari)

function DaysBetween() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [inclusive, setInclusive] = useState(false);
  const [start, setStart] = useState('');
  const [add, setAdd] = useState('30');

  const pa = parseYmd(a);
  const pb = parseYmd(b);
  const ps = parseYmd(start);
  const n = parseNum(add);
  const added = ps && n !== null && Number.isInteger(n) && Math.abs(n) < 100000 ? addDays(ps, n) : null;

  return (
    <div className="space-y-4">
      <Card title="Jumlah hari antara dua tanggal">
        <Row>
          <TextField label="Dari" type="date" value={a} onChange={setA} />
          <TextField label="Sampai" type="date" value={b} onChange={setB} />
        </Row>
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} /> Hitung tanggal akhir juga (inklusif)
        </label>
        {pa && pb ? (
          <StatGrid cols={3}>
            <Stat label="Jumlah hari" value={Math.abs(daysBetween(pa, pb)) + (inclusive ? 1 : 0)} accent />
            <Stat label="Hari kerja (Sen–Jum)" value={businessDays(pa, pb, inclusive)} sub="Libur nasional tidak dihitung" />
            <Stat label="Akhir pekan" value={Math.abs(daysBetween(pa, pb)) + (inclusive ? 1 : 0) - businessDays(pa, pb, inclusive)} />
          </StatGrid>
        ) : (
          <Notice>Pilih dua tanggal.</Notice>
        )}
      </Card>
      <Card title="Tambah / kurangi hari">
        <Row>
          <TextField label="Tanggal awal" type="date" value={start} onChange={setStart} />
          <NumField label="Jumlah hari" value={add} onChange={setAdd} hint="Gunakan angka negatif untuk mundur." />
        </Row>
        {added ? <Stat label="Hasil" value={`${weekdayName(added)}, ${formatYmd(added)}`} accent /> : null}
      </Card>
    </div>
  );
}

// ─────────────────────────── Konverter satuan

function UnitConverter({ categoryId }: { categoryId: string }) {
  const cat = getCategory(categoryId);
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState(cat.units[0].id);
  const [to, setTo] = useState(cat.units[Math.min(1, cat.units.length - 1)].id);

  const n = parseNum(value);
  const fromU = cat.units.find((u) => u.id === from) ?? cat.units[0];
  const toU = cat.units.find((u) => u.id === to) ?? cat.units[0];
  const result = n !== null ? convertLinear(n, fromU, toU) : null;
  const options = cat.units.map((u) => ({ value: u.id, label: u.label }));

  return (
    <Card>
      <NumField label="Nilai" value={value} onChange={setValue} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <SelectField label="Dari" value={from} onChange={setFrom} options={options} />
        <button type="button" className="btn !px-3" aria-label="Tukar satuan" onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowLeftRight size={16} aria-hidden />
        </button>
        <SelectField label="Ke" value={to} onChange={setTo} options={options} />
      </div>
      {result !== null ? (
        <>
          <Stat label={`${formatConverted(n ?? 0)} ${fromU.label.split('(').pop()?.replace(')', '') ?? ''} =`} value={`${formatConverted(result)} ${toU.label.split('(').pop()?.replace(')', '') ?? ''}`} accent />
          <details className="text-sm">
            <summary className="cursor-pointer select-none py-2 text-zinc-300">Semua satuan</summary>
            <KeyValue rows={cat.units.map((u) => [u.label, formatConverted(convertLinear(n ?? 0, fromU, u))])} />
          </details>
        </>
      ) : (
        <Notice>Masukkan angka yang valid.</Notice>
      )}
      {categoryId === 'data' ? <p className="text-xs text-zinc-500">KB/MB/GB memakai basis 1000; KiB/MiB/GiB memakai basis 1024 (bila tersedia di daftar).</p> : null}
    </Card>
  );
}

function TemperatureConverter() {
  const [value, setValue] = useState('25');
  const [from, setFrom] = useState<TempUnit>('C');
  const n = parseNum(value);
  const belowZero = n !== null && convertTemperature(n, from, 'K') < 0;

  return (
    <Card>
      <Row>
        <NumField label="Suhu" value={value} onChange={setValue} />
        <SelectField label="Dari" value={from} onChange={(v) => setFrom(v as TempUnit)} options={TEMP_UNITS.map((u) => ({ value: u.id, label: u.label }))} />
      </Row>
      {n === null ? (
        <Notice>Masukkan angka yang valid.</Notice>
      ) : belowZero ? (
        <Notice kind="error">Di bawah nol absolut — suhu ini tidak mungkin ada.</Notice>
      ) : (
        <StatGrid cols={4}>
          {TEMP_UNITS.map((u) => (
            <Stat key={u.id} label={u.label} value={formatConverted(convertTemperature(n, from, u.id))} accent={u.id === from} />
          ))}
        </StatGrid>
      )}
    </Card>
  );
}

const Length = () => <UnitConverter categoryId="length" />;
const Weight = () => <UnitConverter categoryId="mass" />;
const Storage = () => <UnitConverter categoryId="data" />;

const tools: Record<string, ComponentType> = {
  'stopwatch': Stopwatch,
  'timer': Timer,
  'countdown': Countdown,
  'age-calculator': AgeCalculator,
  'date-difference': DateDifference,
  'days-between-dates': DaysBetween,
  'length-converter': Length,
  'weight-converter': Weight,
  'temperature-converter': TemperatureConverter,
  'storage-converter': Storage,
};

export { UnitConverter, TemperatureConverter };
export default tools;
