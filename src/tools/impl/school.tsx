'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Pause, Play, Plus, RotateCcw, SkipForward, Trash2 } from 'lucide-react';
import {
  GRADE_SCALE, bandFromLetter, bandFromPoint, bandFromScore, computeGpa, cumulativeGpa, gpaPredicate, neededScore,
  weightedAverage,
} from '@/lib/school';
import { daysBetween, formatYmd, parseYmd, todayYmd, weekdayName } from '@/lib/datetime';
import { shuffle } from '@/lib/random';
import {
  Actions, Card, KeyValue, Notice, NumField, Row, Segmented, SelectField, Stat, StatGrid, TextAreaField, TextField,
  fmtNum, parseNum, useStored,
} from '@/components/tools/ui';
import { cn } from '@/lib/utils';

const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Bunyi pendek lewat WebAudio (diam bila tidak didukung / diblokir autoplay). */
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

// ─────────────────────────── daftar nilai berbobot (dipakai Average & Final)

interface Entry {
  id: number;
  name: string;
  score: string;
  weight: string;
}

let nextId = 1;
const newEntry = (name = '', weight = '1'): Entry => ({ id: nextId++, name, score: '', weight });

function EntryList({
  items,
  setItems,
  showWeight,
  noun,
}: {
  items: Entry[];
  setItems: (fn: (p: Entry[]) => Entry[]) => void;
  showWeight: boolean;
  noun: string;
}) {
  const patch = (id: number, p: Partial<Entry>) => setItems((arr) => arr.map((e) => (e.id === id ? { ...e, ...p } : e)));
  return (
    <div className="space-y-2">
      {items.map((e, i) => (
        <div key={e.id} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <TextField label={`${noun} ${i + 1}`} value={e.name} onChange={(v) => patch(e.id, { name: v })} placeholder="Nama (opsional)" className="col-span-2 sm:col-span-1" />
          <NumField label="Nilai" value={e.score} onChange={(v) => patch(e.id, { score: v })} placeholder="0–100" />
          {showWeight ? <NumField label="Bobot" value={e.weight} onChange={(v) => patch(e.id, { weight: v })} /> : <span className="hidden sm:block" />}
          <button type="button" className="btn btn-sm !px-3" aria-label={`Hapus ${noun} ${i + 1}`} disabled={items.length <= 1} onClick={() => setItems((arr) => arr.filter((x) => x.id !== e.id))}>
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => setItems((arr) => [...arr, newEntry('', '1')])}>
        <Plus size={15} aria-hidden /> Tambah {noun.toLowerCase()}
      </button>
    </div>
  );
}

function toItems(entries: Entry[], weighted: boolean) {
  const out: { score: number; weight: number }[] = [];
  for (const e of entries) {
    const s = parseNum(e.score);
    if (s === null) continue;
    const w = weighted ? parseNum(e.weight) : 1;
    if (w === null || w < 0) continue;
    out.push({ score: s, weight: w });
  }
  return out;
}

// ─────────────────────────── Average Grade

function AverageGrade() {
  const [weighted, setWeighted] = useState(false);
  const [items, setItems] = useState<Entry[]>(() => [newEntry('', '1'), newEntry('', '1'), newEntry('', '1')]);
  const list = toItems(items, weighted);
  const avg = weightedAverage(list);
  return (
    <Card>
      <Segmented
        value={weighted ? 'w' : 's'}
        onChange={(v) => setWeighted(v === 'w')}
        options={[
          { value: 's', label: 'Rata-rata biasa' },
          { value: 'w', label: 'Berbobot' },
        ]}
      />
      <EntryList items={items} setItems={setItems} showWeight={weighted} noun="Nilai" />
      {avg !== null ? (
        <StatGrid cols={3}>
          <Stat label="Rata-rata" value={fmtNum(avg, 2)} accent />
          <Stat label="Jumlah nilai" value={list.length} />
          <Stat label="Predikat" value={`${bandFromScore(avg).letter} · ${bandFromScore(avg).label}`} />
        </StatGrid>
      ) : (
        <Notice>Isi minimal satu nilai{weighted ? ' dengan bobot > 0' : ''}.</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Final Grade

function FinalGrade() {
  const [mode, setMode] = useState<'final' | 'target'>('final');
  const [items, setItems] = useState<Entry[]>(() => [newEntry('Tugas', '30'), newEntry('UTS', '30')]);
  const [lastWeight, setLastWeight] = useState('40');
  const [target, setTarget] = useState('75');

  const list = toItems(items, true);
  const avg = weightedAverage(list);
  const totalW = list.reduce((a, b) => a + b.weight, 0);
  const tg = parseNum(target);
  const lw = parseNum(lastWeight);
  const need = tg !== null && lw !== null ? neededScore(list, lw, tg) : null;

  return (
    <Card>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'final', label: 'Nilai akhir' },
          { value: 'target', label: 'Target ujian akhir' },
        ]}
      />
      <EntryList items={items} setItems={setItems} showWeight noun="Komponen" />
      {mode === 'final' ? (
        avg !== null ? (
          <>
            <StatGrid cols={3}>
              <Stat label="Nilai akhir" value={fmtNum(avg, 2)} accent />
              <Stat label="Total bobot" value={fmtNum(totalW, 2)} />
              <Stat label="Predikat" value={bandFromScore(avg).letter} />
            </StatGrid>
            {Math.abs(totalW - 100) > 1e-9 ? <Notice>Total bobot {fmtNum(totalW, 2)} (bukan 100). Hasil dinormalisasi terhadap total bobot.</Notice> : null}
          </>
        ) : (
          <Notice>Isi nilai dan bobot komponen.</Notice>
        )
      ) : (
        <>
          <Row>
            <NumField label="Bobot ujian akhir" value={lastWeight} onChange={setLastWeight} />
            <NumField label="Target nilai akhir" value={target} onChange={setTarget} />
          </Row>
          {need !== null ? (
            <>
              <Stat label="Nilai yang dibutuhkan di ujian akhir" value={fmtNum(need, 2)} accent />
              {need > 100 ? <Notice kind="warn">Butuh lebih dari 100 — target ini tidak tercapai dengan skala 0–100.</Notice> : null}
              {need < 0 ? <Notice kind="success">Target sudah terlampaui bahkan dengan nilai 0.</Notice> : null}
            </>
          ) : (
            <Notice>Isi bobot ujian akhir (&gt; 0) dan target.</Notice>
          )}
        </>
      )}
    </Card>
  );
}

// ─────────────────────────── Percentage (skor → persen)

function SchoolPercentage() {
  const [score, setScore] = useState('');
  const [max, setMax] = useState('100');
  const s = parseNum(score);
  const m = parseNum(max);
  const ok = s !== null && m !== null && m > 0 && s >= 0;
  const p = ok ? (s / m) * 100 : null;
  return (
    <Card>
      <Row>
        <NumField label="Skor kamu" value={score} onChange={setScore} />
        <NumField label="Skor maksimum" value={max} onChange={setMax} />
      </Row>
      {p !== null ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Persentase" value={`${fmtNum(p, 2)}%`} accent />
            <Stat label="Huruf" value={bandFromScore(p).letter} />
            <Stat label="Skala 4.0" value={bandFromScore(p).point.toFixed(1)} />
          </StatGrid>
          {p > 100 ? <Notice kind="warn">Skor melebihi maksimum.</Notice> : null}
        </>
      ) : (
        <Notice>Isi skor (≥ 0) dan skor maksimum (&gt; 0).</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Grade Converter

function GradeConverter() {
  const [from, setFrom] = useState<'score' | 'letter' | 'point'>('score');
  const [value, setValue] = useState('');

  let band = null as ReturnType<typeof bandFromScore> | null;
  let error = '';
  if (value.trim()) {
    if (from === 'letter') {
      band = bandFromLetter(value);
      if (!band) error = 'Huruf tidak dikenal. Gunakan ' + GRADE_SCALE.map((b) => b.letter).join(', ') + '.';
    } else {
      const n = parseNum(value);
      const max = from === 'score' ? 100 : 4;
      if (n === null || n < 0 || n > max) error = `Masukkan angka 0–${max}.`;
      else band = from === 'score' ? bandFromScore(n) : bandFromPoint(n);
    }
  }

  return (
    <Card>
      <Segmented
        value={from}
        onChange={(v) => {
          setFrom(v);
          setValue('');
        }}
        label="Konversi dari"
        options={[
          { value: 'score', label: 'Angka 0–100' },
          { value: 'letter', label: 'Huruf' },
          { value: 'point', label: 'Skala 4.0' },
        ]}
      />
      <TextField label="Nilai" value={value} onChange={setValue} placeholder={from === 'letter' ? 'B+' : from === 'point' ? '3.3' : '82'} inputMode={from === 'letter' ? 'text' : 'decimal'} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {band ? (
        <StatGrid cols={3}>
          <Stat label="Huruf" value={band.letter} accent sub={band.label} />
          <Stat label="Skala 4.0" value={band.point.toFixed(1)} />
          <Stat label="Rentang angka" value={`≥ ${band.min}`} />
        </StatGrid>
      ) : null}
      <details className="text-sm text-zinc-400">
        <summary className="cursor-pointer select-none py-2 text-zinc-300">Lihat tabel skala yang dipakai</summary>
        <KeyValue rows={GRADE_SCALE.map((b) => [`${b.letter} (${b.label})`, `≥ ${b.min} → ${b.point.toFixed(1)}`])} />
      </details>
      <p className="text-xs text-zinc-500">Skala umum perguruan tinggi; tiap sekolah/kampus bisa berbeda. Cek pedoman institusimu.</p>
    </Card>
  );
}

// ─────────────────────────── GPA

interface Course {
  id: number;
  name: string;
  credits: string;
  grade: string;
}

let courseId = 1;
const newCourse = (): Course => ({ id: courseId++, name: '', credits: '3', grade: 'A' });

function GpaCalculator() {
  const [courses, setCourses] = useState<Course[]>(() => [newCourse(), newCourse(), newCourse()]);
  const [prevGpa, setPrevGpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');

  const patch = (id: number, p: Partial<Course>) => setCourses((arr) => arr.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const rows = courses.flatMap((c) => {
    const cr = parseNum(c.credits);
    const band = bandFromLetter(c.grade);
    return cr !== null && cr > 0 && band ? [{ credits: cr, point: band.point }] : [];
  });
  const term = computeGpa(rows);
  const pg = parseNum(prevGpa);
  const pc = parseNum(prevCredits);
  const cum = term && pg !== null && pc !== null && pc >= 0 && pg >= 0 && pg <= 4 ? cumulativeGpa(pg, pc, term) : null;

  return (
    <Card>
      <div className="space-y-2">
        {courses.map((c, i) => (
          <div key={c.id} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1.6fr_0.7fr_0.9fr_auto]">
            <TextField label={`Mata kuliah ${i + 1}`} value={c.name} onChange={(v) => patch(c.id, { name: v })} placeholder="Opsional" className="col-span-2 sm:col-span-1" />
            <NumField label="SKS" value={c.credits} onChange={(v) => patch(c.id, { credits: v })} />
            <SelectField label="Nilai" value={c.grade} onChange={(v) => patch(c.id, { grade: v })} options={GRADE_SCALE.map((b) => ({ value: b.letter, label: `${b.letter} (${b.point.toFixed(1)})` }))} />
            <button type="button" className="btn btn-sm !px-3" aria-label={`Hapus mata kuliah ${i + 1}`} disabled={courses.length <= 1} onClick={() => setCourses((arr) => arr.filter((x) => x.id !== c.id))}>
              <Trash2 size={15} aria-hidden />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => setCourses((arr) => [...arr, newCourse()])}>
          <Plus size={15} aria-hidden /> Tambah mata kuliah
        </button>
      </div>
      {term ? (
        <StatGrid cols={3}>
          <Stat label="IP semester" value={term.gpa.toFixed(2)} accent sub={gpaPredicate(term.gpa)} />
          <Stat label="SKS semester" value={term.credits} />
          <Stat label="Mutu total" value={fmtNum(term.gpa * term.credits, 2)} />
        </StatGrid>
      ) : (
        <Notice>Isi SKS (&gt; 0) minimal satu mata kuliah.</Notice>
      )}
      <div className="border-t border-white/[0.07] pt-4">
        <p className="mb-2 text-sm font-semibold text-zinc-300">IPK kumulatif (opsional)</p>
        <Row>
          <NumField label="IPK sebelumnya" value={prevGpa} onChange={setPrevGpa} placeholder="3.45" />
          <NumField label="Total SKS sebelumnya" value={prevCredits} onChange={setPrevCredits} />
        </Row>
        {cum !== null ? <div className="mt-3"><Stat label="IPK kumulatif" value={cum.toFixed(2)} accent sub={gpaPredicate(cum)} /></div> : null}
      </div>
    </Card>
  );
}

// ─────────────────────────── Pomodoro

type Phase = 'focus' | 'short' | 'long';
const PHASE_LABEL: Record<Phase, string> = { focus: 'Fokus', short: 'Istirahat singkat', long: 'Istirahat panjang' };

function Pomodoro() {
  const [cfg, setCfg] = useStored('pomodoro:cfg', { focus: '25', short: '5', long: '15', every: '4' });
  const [phase, setPhase] = useState<Phase>('focus');
  const [round, setRound] = useState(1);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(true);
  const minutes = (p: Phase) => {
    const n = parseNum(cfg[p]);
    return n !== null && n > 0 ? Math.min(n, 600) : p === 'focus' ? 25 : 5;
  };
  const total = minutes(phase) * 60;
  const [remaining, setRemaining] = useState(25 * 60);
  const endAt = useRef(0);
  const runningRef = useRef(false);
  runningRef.current = running;
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Sinkronkan sisa waktu saat konfigurasi/fase berubah (selama tidak berjalan).
  useEffect(() => {
    if (!runningRef.current) setRemaining(total);
  }, [total, phase]);

  const phaseRef = useRef<Phase>('focus');
  const roundRef = useRef(1);
  phaseRef.current = phase;
  roundRef.current = round;

  const advance = useCallback((completed: boolean) => {
    setRunning(false);
    const every = Math.max(2, Math.round(parseNum(cfgRef.current.every) ?? 4));
    if (phaseRef.current === 'focus') {
      if (completed) setDone((d) => d + 1);
      setPhase(roundRef.current % every === 0 ? 'long' : 'short');
    } else {
      setRound(roundRef.current + 1);
      setPhase('focus');
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = (endAt.current - Date.now()) / 1000;
      if (left <= 0) {
        if (sound) beep();
        advance(true);
      } else {
        setRemaining(left);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, sound, advance]);

  useEffect(() => {
    if (!running) return;
    const prev = document.title;
    document.title = `${fmtClock(remaining)} · ${PHASE_LABEL[phase]}`;
    return () => {
      document.title = prev;
    };
  }, [remaining, running, phase]);

  const toggle = () => {
    if (!running) endAt.current = Date.now() + remaining * 1000;
    setRunning((r) => !r);
  };
  const reset = () => {
    setRunning(false);
    setPhase('focus');
    setRound(1);
    setDone(0);
    setRemaining(minutes('focus') * 60);
  };
  const progress = total > 0 ? 1 - remaining / total : 0;

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{PHASE_LABEL[phase]} · Ronde {round}</p>
        <p className="font-heading text-6xl font-semibold tabular-nums text-zinc-50" role="timer" aria-live="off">{fmtClock(remaining)}</p>
        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} />
        </div>
        <Actions>
          <button type="button" className="btn btn-primary" onClick={toggle}>
            {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {running ? 'Jeda' : 'Mulai'}
          </button>
          <button type="button" className="btn" onClick={() => advance(false)}>
            <SkipForward size={16} aria-hidden /> Lewati
          </button>
          <button type="button" className="btn" onClick={reset}>
            <RotateCcw size={16} aria-hidden /> Reset
          </button>
        </Actions>
        <p className="text-sm text-zinc-400">Sesi fokus selesai: <span className="font-semibold text-zinc-100">{done}</span></p>
      </div>
      <Row>
        <NumField label="Fokus (menit)" value={cfg.focus} onChange={(v) => setCfg({ ...cfg, focus: v })} />
        <NumField label="Istirahat singkat (menit)" value={cfg.short} onChange={(v) => setCfg({ ...cfg, short: v })} />
        <NumField label="Istirahat panjang (menit)" value={cfg.long} onChange={(v) => setCfg({ ...cfg, long: v })} />
        <NumField label="Istirahat panjang tiap … ronde" value={cfg.every} onChange={(v) => setCfg({ ...cfg, every: v })} />
      </Row>
      <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Bunyi saat fase selesai
      </label>
      <p className="text-xs text-zinc-500">Timer akurat berdasarkan jam sistem, tapi tab perlu tetap terbuka agar bunyi tampil tepat waktu.</p>
    </Card>
  );
}

// ─────────────────────────── Study Timer

interface Session {
  id: number;
  subject: string;
  seconds: number;
  at: string;
}

function StudyTimer() {
  const [log, setLog] = useStored<Session[]>('study:log', []);
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed(base.current + (Date.now() - startedAt.current) / 1000), 500);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    startedAt.current = Date.now();
    base.current = elapsed;
    setRunning(true);
  };
  const pause = () => {
    setElapsed(base.current + (Date.now() - startedAt.current) / 1000);
    setRunning(false);
  };
  const save = () => {
    const total = running ? base.current + (Date.now() - startedAt.current) / 1000 : elapsed;
    if (total < 1) return;
    setLog((l) => [{ id: Date.now(), subject: subject.trim() || 'Tanpa nama', seconds: Math.round(total), at: new Date().toISOString() }, ...l].slice(0, 200));
    setRunning(false);
    setElapsed(0);
    base.current = 0;
  };

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of log) map.set(s.subject, (map.get(s.subject) ?? 0) + s.seconds);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [log]);
  const hm = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} j ${m} m` : `${m} m ${s % 60} d`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <TextField label="Mata pelajaran / topik" value={subject} onChange={setSubject} placeholder="Matematika" />
        <p className="text-center font-heading text-5xl font-semibold tabular-nums text-zinc-50" role="timer" aria-live="off">{fmtClock(Math.floor(elapsed))}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={running ? pause : start}>
            {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {running ? 'Jeda' : elapsed > 0 ? 'Lanjut' : 'Mulai'}
          </button>
          <button type="button" className="btn" onClick={save} disabled={elapsed < 1 && !running}>Simpan sesi</button>
          <button type="button" className="btn" onClick={() => { setRunning(false); setElapsed(0); base.current = 0; }}>
            <RotateCcw size={16} aria-hidden /> Reset
          </button>
        </div>
      </Card>
      <Card title="Ringkasan">
        {totals.length ? (
          <>
            <KeyValue rows={totals.map(([k, v]) => [k, hm(v)])} />
            <div className="max-h-56 overflow-auto rounded-xl border border-white/[0.07]">
              <ul className="divide-y divide-white/[0.05] text-sm">
                {log.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 truncate text-zinc-200">{s.subject}</span>
                    <span className="flex-none text-xs text-zinc-500">{new Date(s.at).toLocaleDateString('id-ID')} · {hm(s.seconds)}</span>
                    <button type="button" aria-label="Hapus sesi" className="text-zinc-500 hover:text-red-300" onClick={() => setLog((l) => l.filter((x) => x.id !== s.id))}>
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => setLog([])}>Hapus semua riwayat</button>
          </>
        ) : (
          <Notice>Belum ada sesi. Riwayat disimpan hanya di browser ini.</Notice>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────── Exam Countdown

function ExamCountdown() {
  const [exams, setExams] = useStored<{ id: number; name: string; date: string }[]>('exam:list', []);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [now, setNow] = useState<ReturnType<typeof todayYmd> | null>(null);
  useEffect(() => {
    setNow(todayYmd());
    const id = window.setInterval(() => setNow(todayYmd()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const parsed = parseYmd(date);
  const add = () => {
    if (!parsed) return;
    setExams((l) => [...l, { id: Date.now(), name: name.trim() || 'Ujian', date }].sort((a, b) => a.date.localeCompare(b.date)));
    setName('');
    setDate('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <Row>
          <TextField label="Nama ujian" value={name} onChange={setName} placeholder="UAS Fisika" />
          <TextField label="Tanggal" type="date" value={date} onChange={setDate} />
        </Row>
        <button type="button" className="btn btn-primary" disabled={!parsed} onClick={add}>
          <Plus size={16} aria-hidden /> Tambah
        </button>
      </Card>
      {exams.length === 0 ? (
        <Notice>Belum ada ujian. Daftar disimpan di browser ini.</Notice>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {exams.map((e) => {
            const d = parseYmd(e.date);
            const left = d && now ? daysBetween(now, d) : null;
            return (
              <div key={e.id} className="panel panel-pad flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-100">{e.name}</p>
                  {d ? <p className="text-xs text-zinc-500">{weekdayName(d)}, {formatYmd(d)}</p> : null}
                  <p className={cn('mt-2 font-heading text-2xl font-semibold', left !== null && left < 0 ? 'text-zinc-500' : 'text-accent')}>
                    {left === null ? '…' : left === 0 ? 'Hari ini' : left > 0 ? `${left} hari lagi` : `${-left} hari lalu`}
                  </p>
                </div>
                <button type="button" aria-label={`Hapus ${e.name}`} className="btn btn-sm !px-3" onClick={() => setExams((l) => l.filter((x) => x.id !== e.id))}>
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Flashcard

interface Card_ {
  id: number;
  q: string;
  a: string;
}

function Flashcard() {
  const [cards, setCards] = useStored<Card_[]>('flashcards', []);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setOrder(cards.map((c) => c.id));
    setIdx(0);
    setFlipped(false);
  }, [cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = cards.find((c) => c.id === order[idx]);
  const go = (d: number) => {
    if (!order.length) return;
    setFlipped(false);
    setIdx((i) => (i + d + order.length) % order.length);
  };

  return (
    <div className="space-y-4">
      <Card title="Tambah kartu">
        <Row>
          <TextField label="Pertanyaan / istilah" value={q} onChange={setQ} />
          <TextField label="Jawaban / arti" value={a} onChange={setA} />
        </Row>
        <button type="button" className="btn btn-primary" disabled={!q.trim() || !a.trim()} onClick={() => { setCards((l) => [...l, { id: Date.now(), q: q.trim(), a: a.trim() }]); setQ(''); setA(''); }}>
          <Plus size={16} aria-hidden /> Tambah kartu
        </button>
      </Card>
      {current ? (
        <Card title={`Kartu ${idx + 1} dari ${order.length}`}>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? 'Tampilkan pertanyaan' : 'Tampilkan jawaban'}
            className="flex min-h-[180px] w-full items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-6 text-center transition hover:border-accent/50"
          >
            <span>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-accent">{flipped ? 'Jawaban' : 'Pertanyaan'}</span>
              <span className="block break-words font-heading text-xl text-zinc-50">{flipped ? current.a : current.q}</span>
            </span>
          </button>
          <Actions>
            <button type="button" className="btn" onClick={() => go(-1)}>Sebelumnya</button>
            <button type="button" className="btn" onClick={() => setFlipped((f) => !f)}>Balik</button>
            <button type="button" className="btn" onClick={() => go(1)}>Berikutnya</button>
            <button type="button" className="btn" onClick={() => { setOrder((o) => shuffle(o)); setIdx(0); setFlipped(false); }}>Acak</button>
            <button type="button" className="btn" aria-label="Hapus kartu ini" onClick={() => setCards((l) => l.filter((c) => c.id !== current.id))}>
              <Trash2 size={15} aria-hidden /> Hapus
            </button>
          </Actions>
        </Card>
      ) : (
        <Notice>Belum ada kartu. Kartu disimpan di browser ini (bukan di server).</Notice>
      )}
    </div>
  );
}

// ─────────────────────────── Random Quiz (dari soal buatan sendiri)

function parseQuestions(text: string): { q: string; a: string }[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => {
      const i = l.indexOf('|');
      if (i < 1) return [];
      const q = l.slice(0, i).trim();
      const a = l.slice(i + 1).trim();
      return q && a ? [{ q, a }] : [];
    });
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function RandomQuiz() {
  const [text, setText] = useStored('quiz:text', '');
  const questions = useMemo(() => parseQuestions(text), [text]);
  const [deck, setDeck] = useState<{ q: string; a: string }[]>([]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const playing = deck.length > 0;
  const finished = playing && i >= deck.length;

  const start = () => {
    setDeck(shuffle(questions));
    setI(0);
    setScore(0);
    setAnswer('');
    setResult(null);
  };
  const check = () => {
    if (result !== null) return;
    const ok = norm(answer) === norm(deck[i].a);
    setResult(ok);
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    setI((n) => n + 1);
    setAnswer('');
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <Card title="Bank soal">
        <TextAreaField label="Satu soal per baris: pertanyaan | jawaban" value={text} onChange={setText} rows={6} placeholder={'Ibu kota Indonesia | Jakarta\n2 + 2 | 4'} hint="Jawaban dicocokkan tanpa membedakan huruf besar/kecil. Disimpan di browser ini." />
        <p className="text-sm text-zinc-400">{questions.length} soal valid.</p>
        <button type="button" className="btn btn-primary" disabled={questions.length === 0} onClick={start}>Mulai kuis acak</button>
      </Card>
      {playing && !finished ? (
        <Card title={`Soal ${i + 1} dari ${deck.length}`}>
          <p className="break-words font-heading text-xl text-zinc-50">{deck[i].q}</p>
          <form onSubmit={(e) => { e.preventDefault(); check(); }} className="space-y-3">
            <TextField label="Jawabanmu" value={answer} onChange={setAnswer} autoFocus />
            {result === null ? (
              <button type="submit" className="btn btn-primary" disabled={!answer.trim()}>Periksa</button>
            ) : (
              <>
                <Notice kind={result ? 'success' : 'error'}>{result ? 'Benar!' : <>Belum tepat. Jawaban: <strong>{deck[i].a}</strong></>}</Notice>
                <button type="button" className="btn btn-primary" onClick={next}>{i + 1 >= deck.length ? 'Lihat skor' : 'Soal berikutnya'}</button>
              </>
            )}
          </form>
        </Card>
      ) : null}
      {finished ? (
        <Card title="Selesai">
          <StatGrid>
            <Stat label="Benar" value={`${score} / ${deck.length}`} accent />
            <Stat label="Persentase" value={`${fmtNum((score / deck.length) * 100, 0)}%`} />
          </StatGrid>
          <button type="button" className="btn" onClick={start}>Ulangi</button>
        </Card>
      ) : null}
    </div>
  );
}

const tools: Record<string, ComponentType> = {
  'average-grade': AverageGrade,
  'final-grade': FinalGrade,
  'school-percentage': SchoolPercentage,
  'grade-converter': GradeConverter,
  'gpa-calculator': GpaCalculator,
  'pomodoro': Pomodoro,
  'study-timer': StudyTimer,
  'exam-countdown': ExamCountdown,
  'flashcard': Flashcard,
  'random-quiz': RandomQuiz,
};

export default tools;
