import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { BASE_BLOCKS } from '../src/baseblock-data';
import { LINK_HEADS, LINK_REFS, gistOf, linkLine } from '../src/link';

/**
 * 牽動格頭一句（2026-09）：講呢張盤嘅對宮同三合宮坐咗乜，唔再係每本書一樣嘅關係塊。
 * 每一截都由嗰粒星喺嗰個宮嘅基塊撮出嚟 —— 冇新嘅象義。
 */
describe('三方四正嘅一截講法', () => {
  it('一百六十八格全部抽得到，而且講得出係邊粒星', () => {
    const bad = BASE_BLOCKS.filter((b) => {
      const g = gistOf(b.star, b.palace);
      return !g || !g.includes(b.star) || /」|「|《|這一格|本書/.test(g);
    }).map((b) => `${b.star}.${b.palace}=${gistOf(b.star, b.palace)}`);
    expect(bad).toEqual([]);
  });

  it('命宮嗰截唔講兩次「在命」', () => {
    for (const b of BASE_BLOCKS.filter((x) => x.palace === '命宮')) {
      expect(gistOf(b.star, b.palace)!, b.id).not.toMatch(/在命/);
    }
  });
});

describe('牽動格頭一句', () => {
  const r = cast({
    solar: { y: 1990, m: 6, d: 16 }, time: { h: 7, min: 34 }, sex: 'female', tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
  });
  if (!r.ok) throw new Error('排唔到盤');
  const chart = r.value;

  it('對宮行先，三個宮都講到，而且係呢張盤嘅星', () => {
    const ming = chart.palaces.find((p) => p.name === '命宮')!;
    const line = linkLine(chart, ming)!;
    /* 直白（2026-09-29）：講生活嘅邊一面，唔講宮名；對宮（遷移＝在外）行先。
       2026-10-05：開頭唔再先列一次範疇（後面每截已經以範疇起頭） */
    /* 2026-10-13：開頭係一句完整嘅話，唔再「⋯：」 */
    expect(line.text.startsWith(`${LINK_HEADS[0]}在外時，`)).toBe(true);
    expect(line.sources).toHaveLength(3);
    expect(line.text).not.toContain('：');
    expect(line.text).toMatch(/在外時，.+；.+，.+；.+，.+。$/);
    expect(line.text).not.toMatch(/正對|連成一組|宮，/);
  });

  it('唔再有「不是獨立看的」「單看一宮」呢類每本書一樣嘅句', () => {
    for (const p of chart.palaces) {
      const t = linkLine(chart, p)?.text ?? '';
      expect(t, p.name).not.toMatch(/獨立看|單看一宮|分開讀|要一起讀/);
    }
  });
});

describe('全書每宮嗰截只詳講一次（2026-09-30）', () => {
  const r = cast({
    solar: { y: 1990, m: 6, d: 16 }, time: { h: 7, min: 34 }, sex: 'female', tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
  });
  if (!r.ok) throw new Error('排唔到盤');
  const chart = r.value;
  const ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

  it('跟閱讀次序行一次：每一截只出一次；講完就唔再指返（2026-10-13 起冇新嘢成段唔出）', () => {
    const used = new Set<string>();
    const lines = ORDER.map((n) => linkLine(chart, chart.palaces.find((p) => p.name === n)!, used)?.text ?? null);
    const texts = lines.filter((t): t is string => t !== null);
    const strip = (t: string) => LINK_HEADS.reduce((x, h) => x.replace(h, ''), t);
    const clauses = texts.flatMap((t) => strip(t).replace(/。$/, '').split('；'));
    expect(clauses.length).toBe(new Set(clauses).size);
    /* 十二宮每宮詳講一次，唔多唔少 */
    expect(clauses).toHaveLength(12);
    /* 冇指返其他章嘅尾巴；後面嘅章三個宮都講過就成段唔出 */
    for (const t of texts) expect(t).not.toMatch(new RegExp(`見〈|${LINK_REFS.join('|')}`));
    expect(lines.at(-1)).toBeNull();
    /* 開頭一本書每款最多一次 */
    const heads = texts.map((t) => LINK_HEADS.find((h) => t.startsWith(h))).filter(Boolean);
    expect(heads.length).toBe(new Set(heads).size);
  });

  it('唔畀 used 就三截都講（單獨砌一章）', () => {
    const t = linkLine(chart, chart.palaces.find((p) => p.name === '父母')!)!.text;
    expect(t).not.toMatch(/見〈/);
  });
});
