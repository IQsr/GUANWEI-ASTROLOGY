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
  it('天同酉 獨坐 火星同度：白手興家（專條壓通則）、中年辛苦晚年順、祖業守不住、享受性質', () => {
    expect(ids(synthWealthChapter(elder))).toEqual(['syn.wealth.tiantong.maoyou', 'syn.wealth.tiantong.alone', 'syn.wealth.tiantong.huoling', 'syn.wealth.tiantong.enjoy']);
  });
  it('天梁巳 對天同：早中年難聚（專條先）、先名後利、落陷財源不廣、任職為宜', () => {
    const segs = synthWealthChapter(young)!;
    expect(ids(segs)).toEqual(['syn.wealth.tianliang.sihai', 'syn.wealth.tianliang.name', 'syn.wealth.tianliang.sihai-luoxian', 'syn.wealth.tianliang.trade']);
    expect(segs[0]!.statements[1]!.text).toBe('你的財帛宮天梁坐巳宮，對宮是天同。');
  });
  it('a chart with no pilot card keeps the old chapter', () => {
    const other = chartOf({ y: 1996, m: 1, d: 21 }, { h: 8, min: 4 }, 'female'); // 財帛巨門
    expect(synthWealthChapter(other)).toBeNull();
    expect(synthYearChapter(other, 2026)).toBeNull(); // 只得通則卡（弱地、文昌落陷），冇星系運限卡
  });
});

describe('今年', () => {
  it('64 歲天機丑：廉相廉忌求變破敗、祿逢沖破、弱地；十年背景天梁；冇考試句', () => {
    const segs = synthYearChapter(elder, 2026)!;
    expect(ids(segs).slice(0, 3)).toEqual(['syn.sys32.lianxiang-ji', 'syn.year.lu-chongpo', 'syn.year.lu-weak']);
    expect(segs.find((s) => s.slot === '背景')?.statements[0]!.source_ids[0]).toMatch(/^syn\.sys32\.tianliang/);
    expect(segs.map((s) => s.text).join('')).not.toContain('考試');
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
