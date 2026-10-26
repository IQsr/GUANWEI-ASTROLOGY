import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { birthHalf, evaluate } from '../src/condition';
import { evaluatePalacePredicate } from '../src/palace-predicate';
import { palaceReading } from '../src/palace-reader';
import { citation } from '../src/citation';
import remaining from '../src/cards/palace-remaining.json';
import focused from '../src/cards/palace-focused.json';

/** 2026-10-26 日夜生同雜曜（palace-conditions-v2）。 */
const SINCE = 'palace-conditions-v2';
const fresh = [...remaining.rules, ...focused.rules].filter((r) => 'since' in r && r.since === SINCE);
const citeOf = (id: string) => remaining.rules.some((r) => r.id === id) ? 'palace.remaining.v1' : 'palace.focused.v1';

/** mulberry32：簡單 LCG 嘅低位同月份、時辰相關，會令某啲組合永遠唔出。 */
function rng(seed: number) {
  let s = seed >>> 0;
  return (n: number) => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (((t ^ (t >>> 14)) >>> 0) % n); };
}
function charts(n: number, seed: number): Chart[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const input: BirthInput = { solar: { y: 1950 + r(58), m: 1 + r(12), d: 1 + r(28) }, time: { h: r(24), min: r(60) }, tz: 'Asia/Hong_Kong',
      place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: r(2) ? 'male' : 'female' };
    const c = cast(input); if (!c.ok) throw Error(c.message); return c.value;
  });
}
const sample = charts(600, 20261026);

it('日生＝寅至未時、夜生＝申至丑時（深造講義 p.9、p.21），子時一律夜生', () => {
  const half = (s: number) => birthHalf({ lunar: { shichen: s } } as Chart);
  expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(half)).toEqual(['夜生', '夜生', '日生', '日生', '日生', '日生', '日生', '日生', '夜生', '夜生', '夜生', '夜生']);
  for (const c of sample.slice(0, 50)) {
    const h = birthHalf(c);
    const hit = evaluate({ birth: h }, { chart: c });
    expect(hit.status).toBe('matched');
    if (hit.status === 'matched') expect(hit.bindings[0]!.note).toMatch(/^[子丑寅卯辰巳午未申酉戌亥]時生，屬[日夜]生人$/);
    expect(evaluate({ birth: h === '日生' ? '夜生' : '日生' }, { chart: c }).status).toBe('unmatched');
  }
});

it('宮位條件：birth 只看安命時辰；lacks 等於 has 取反', () => {
  const c = sample[0]!, p = c.palaces[0]!;
  const yes = evaluatePalacePredicate({ op: 'birth', is: birthHalf(c) }, c, p);
  expect(yes).toMatchObject({ matched: true, status: 'matched' });
  expect(yes.checks[0]).toContain('原書以寅至未時為日生、申至丑時為夜生');
  expect(evaluatePalacePredicate({ op: 'birth', is: birthHalf(c) === '日生' ? '夜生' : '日生' }, c, p).matched).toBe(false);
  for (const chart of sample.slice(0, 100)) for (const q of chart.palaces) {
    const has = evaluatePalacePredicate({ op: 'has', scope: 'own', names: ['天刑'] }, chart, q);
    const lacks = evaluatePalacePredicate({ op: 'lacks', scope: 'own', names: ['天刑'] }, chart, q);
    expect(lacks.matched).toBe(!has.matched);
  }
  expect(() => evaluatePalacePredicate({ op: 'lacks', scope: 'own', names: ['天刑'], hua: '祿' }, c, p)).toThrow();
});

it('新卡只入新成書入口：基準入口一律唔評、唔引', () => {
  expect(fresh).toHaveLength(25);
  for (const c of sample.slice(0, 200)) for (const palace of new Set(fresh.map((r) => r.palace))) {
    const cited = palaceReading(c, palace, 2026)!.flatMap((s) => s.statements.flatMap((x) => [...x.source_ids, ...x.citations]));
    expect(cited.some((id) => id.includes('cond2-') || fresh.some((r) => id === r.id))).toBe(false);
  }
});

it('每條新卡：出處段齊、當盤符合就成段出現並附盤面事實；唔符合唔出', () => {
  const seen = new Map<string, number>();
  const palaces = [...new Set(fresh.map((r) => r.palace))];
  for (const c of sample) {
   const read = new Map(palaces.map((p) => [p, palaceReading(c, p, 2026, true)!]));
   for (const rule of fresh) {
    const rows = read.get(rule.palace)!;
    const row = rows.find((s) => s.statements.some((x) => x.source_ids.includes(rule.id)));
    const p = c.palaces.find((q) => q.name === rule.palace)!;
    const keyed = !p.borrowsFrom && rule.keys.some((k) => {
      const names = p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
      return k.startsWith('has:') ? names.includes(k.slice(4)) : [...names].sort().join('+') === k.split('+').sort().join('+');
    });
    const ev = evaluatePalacePredicate(rule.when as Parameters<typeof evaluatePalacePredicate>[0], c, p);
    if (!keyed || !ev.matched) { expect(row, `${rule.id} 唔符合都出咗`).toBeUndefined(); continue; }
    seen.set(rule.id, (seen.get(rule.id) ?? 0) + 1);
    if (!row) continue; // 符合但被同宮優先次序更高嘅兩條擠走
    expect(row.text).toContain(rule.text);
    expect(row.statements.at(-1)!.citations).toEqual(rule.sources.map((s) => `${citeOf(rule.id)}:${s}`));
    if (JSON.stringify(rule.when).includes('"birth"')) expect(row.text).toMatch(/時生，屬[日夜]生人/);
  }
  }
  console.log(JSON.stringify(Object.fromEntries(fresh.map((r) => [r.id, seen.get(r.id) ?? 0]))));
  for (const rule of fresh) for (const s of rule.sources) expect(citation(`${citeOf(rule.id)}:${s}`)?.text, rule.id).toBeTruthy();
  // 罕見組合（1500盤試抽少過5次）喺600盤未必出現；其餘每條最少中一次。
  const rare = new Set(['wealth-sun-wu-day', 'career-qisha-yang-xing', 'career-wupo-xing', 'wealth-jumen-yang-xing',
    'career-tanlang-ziwu-xing', 'spouse-tanlang-ziwu-xing', 'wealth-ji-chouwei-xing']);
  for (const rule of fresh) if (!rare.has(rule.id)) expect(seen.get(rule.id) ?? 0, rule.id).toBeGreaterThan(0);
}, 120_000);
