import { describe, expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import index from '../../../tools/wang-reference/deep-index.json';
import { SYNTHESIS_CARDS, SYNTHESIS_SOURCES, bookBrightness, synthesisLint, synthWealthChapter, synthYearChapter } from '../src/synthesis';
import { citation } from '../src/citation';

const place = { lng: 114.17, lat: 22.32, label: '香港' };
const chartOf = (solar: BirthInput['solar'], time: BirthInput['time'], sex: BirthInput['sex']) => {
  const c = cast({ solar, time, sex, tz: 'Asia/Hong_Kong', place });
  if (!c.ok) throw Error('cast');
  return c.value;
};
/** 兩次 A/B 盲評用嘅盤（tmp/ab-20261027、tmp/ab2-20261027）。 */
const elder = chartOf({ y: 1964, m: 1, d: 21 }, { h: 0, min: 44 }, 'female');
const young = chartOf({ y: 2004, m: 9, d: 25 }, { h: 0, min: 28 }, 'female');
const MAJOR = new Set(['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']);
const majorsIn = (c: ReturnType<typeof chartOf>, name: string) => c.palaces.find((p) => p.name === name)!.stars.some((s) => MAJOR.has(s.name));
/** 固定種子嘅隨機盤（同 book-lint 一樣嘅線性同餘）。 */
function sample(n: number) {
  let s = 20261028;
  const r = (k: number) => { s = (s * 1103515245 + 12345) % 2147483648; return s % k; };
  const out: ReturnType<typeof chartOf>[] = [];
  while (out.length < n) {
    const c = cast({ solar: { y: 1940 + r(70), m: 1 + r(12), d: 1 + r(28) }, time: { h: r(24), min: r(60) }, sex: r(2) ? 'male' : 'female', tz: 'Asia/Hong_Kong', place });
    if (c.ok) out.push(c.value);
  }
  return out;
}
const ids = (segs: { statements: { source_ids: string[] }[] }[] | null) => segs?.map((s) => s.statements[0]!.source_ids[0]) ?? [];

it('every source paragraph matches the reference index fingerprint, page and section', () => {
  const blocks = new Map((index as { blocks: { id: string; text_sha256: string; pdf_page: number; section_title: string }[] }).blocks.map((b) => [b.id, b]));
  for (const s of SYNTHESIS_SOURCES) expect(blocks.get(s.id), s.id).toMatchObject({ text_sha256: s.sha256, pdf_page: s.page, section_title: s.section });
  for (const c of SYNTHESIS_CARDS) expect(citation(`syn.v1:${c.source}`)?.page, c.id).toBe(Number(c.source.slice(10, 13)));
});

it('uses the book brightness for the cells the 2026-10-27 report settled', () => {
  expect(bookBrightness({ name: '太陽', brightness: '不' }, '丑')).toBe('陷');
  expect(bookBrightness({ name: '太陰', brightness: '陷' }, '辰')).toBe('陷'); // 內文支持引擎，唔跟書表
  expect(bookBrightness({ name: '天梁', brightness: '陷' }, '巳')).toBe('陷');
});

describe('錢', () => {
  it('天同酉 獨坐 火星同度：白手興家（專條壓通則）、祖業守不住（條件多先）、中年辛苦晚年順、享受性質', () => {
    expect(ids(synthWealthChapter(elder))).toEqual(['syn.wealth.tiantong.maoyou', 'syn.wealth.tiantong.huoling', 'syn.wealth.tiantong.alone', 'syn.wealth.tiantong.enjoy']);
  });
  it('天梁巳 對天同：早中年難聚（專條先）、先名後利、落陷財源不廣、任職為宜', () => {
    const segs = synthWealthChapter(young)!;
    expect(ids(segs)).toEqual(['syn.wealth.tianliang.sihai', 'syn.wealth.tianliang.name', 'syn.wealth.tianliang.sihai-luoxian', 'syn.wealth.tianliang.trade']);
    expect(segs[0]!.statements[1]!.text).toBe('你的財帛宮天梁坐巳宮，對宮是天同。');
  });
  it('空宮財帛照用舊章；今年冇星系運限卡亦照用舊章', () => {
    expect(sample(60).some((c) => synthYearChapter(c, 2026) === null)).toBe(true); // 冇星系運限卡（流年、大限都冇）就照用舊章
    const empty = sample(400).find((c) => !majorsIn(c, '財帛'))!;
    expect(synthWealthChapter(empty)).toBeNull();
  });
  it('400 個隨機盤：財帛有主星就有錢章（≥99%），每章 1–4 個判斷，寫作 lint 全清', () => {
    const charts = sample(400).filter((c) => majorsIn(c, '財帛'));
    const books = charts.map((c) => synthWealthChapter(c));
    expect(books.filter(Boolean).length / charts.length).toBeGreaterThanOrEqual(0.99);
    for (const b of books) if (b) { expect(b.length).toBeGreaterThanOrEqual(1); expect(b.length).toBeLessThanOrEqual(4); expect(synthesisLint(b)).toEqual([]); }
  });
});

describe('今年', () => {
  it('400 個隨機盤（2026）：有星系運限卡嘅今年章 ≥10%，每章以結論開頭，寫作 lint 全清', () => {
    const books = sample(400).map((c) => synthYearChapter(c, 2026)).filter((b): b is NonNullable<typeof b> => !!b);
    expect(books.length / 400).toBeGreaterThanOrEqual(0.1);
    for (const b of books) { expect(b[0]!.slot).toBe('結論'); expect(synthesisLint(b)).toEqual([]); }
  });
  it('64 歲天機丑：廉相廉忌求變破敗、祿逢沖破、弱地；十年背景天梁；冇考試句', () => {
    const segs = synthYearChapter(elder, 2026)!;
    expect(ids(segs).slice(0, 3)).toEqual(['syn.sys32.lianxiang-ji', 'syn.year.lu-chongpo', 'syn.year.lu-weak']);
    expect(segs.find((s) => s.slot === '背景')?.statements[0]!.source_ids[0]).toMatch(/^syn\.sys32\.tianliang/);
    expect(segs.map((s) => s.text).join('')).not.toContain('考試');
  });
  it('通則版：冇星系運限卡嘅年份用流年四化通則卡（≥2 個判斷），覆蓋多過星系版，lint 全清', () => {
    const charts = sample(400);
    const sys = charts.filter((c) => synthYearChapter(c, 2026)).length;
    const gen = charts.map((c) => synthYearChapter(c, 2026, { general: true })).filter((b): b is NonNullable<typeof b> => !!b);
    expect(gen.length).toBeGreaterThan(sys);
    for (const b of gen) { expect(b[0]!.slot).toBe('結論'); expect(synthesisLint(b)).toEqual([]); }
    console.log(`今年覆蓋：星系 ${sys}/400，通則 ${gen.length}/400`);
  });
  it('23 歲空宮借機巨：機巨卡只限實坐（G1），冇星系運限卡就沿用舊章', () => {
    expect(synthYearChapter(young, 2026)).toBeNull();
  });
  it('這十年背景吉凶並見就兩邊都出：天梁化科會吉，同時會到煞曜', () => {
    const bg = synthYearChapter(elder, 2026)!.filter((s) => s.slot === '背景').map((s) => s.statements[0]!.source_ids[0]);
    expect(bg).toEqual(['syn.sys32.tianliang', 'syn.sys32.tianliang-sha']);
  });
});

it('G1–G10 writing lint is clean on both A/B charts', () => {
  for (const c of [elder, young]) {
    expect(synthesisLint(synthWealthChapter(c) ?? [])).toEqual([]);
    expect(synthesisLint(synthYearChapter(c, 2026) ?? [])).toEqual([]);
  }
});
