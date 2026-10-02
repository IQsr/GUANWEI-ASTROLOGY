import { describe, expect, it } from 'vitest';
import { annual, cast } from '@guanwei/ziwei';
import { yearChapter } from '../src/liunian';
import { pivotRule } from '../src/daxian';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';
import { withoutCitations } from '../src/lexicon';

/** 流年章〈這一年〉（2026-09-30）：出處喺 liunian.ts 開頭 */

let seed = 2026093001;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};
const CHARTS = Array.from({ length: 400 }, (_, i) =>
  cast({
    solar: { y: 1935 + rnd(90), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  }),
)
  .filter((r) => r.ok)
  .map((r) => (r as { ok: true; value: Parameters<typeof yearChapter>[0]['chart'] }).value);

describe('這一年', () => {
  it('四百張盤都砌得出，段段過 lint、冇講方法冇列條件、冇阿拉伯數字', () => {
    for (const c of CHARTS) {
      const ch = yearChapter({ chart: c, year: 2026 })!;
      expect(ch).not.toBeNull();
      expect(scanPlain(ch.segments[0]!.text, '結論', { leadsWithConclusion: true }), ch.segments[0]!.text).toEqual([]);
      for (const s of ch.segments) {
        expect(scanForbidden(withoutCitations(s.text), 'body'), `${s.slot}：${s.text}`).toEqual([]);
        expect(scanPlain(s.text, s.slot), s.text).toEqual([]);
        expect(s.text).not.toMatch(/\d/);
      }
    }
  });

  it('流年四化四句都講到 —— 落入四方面嘅喺嗰段講，其餘喺四化段講明落喺邊宮', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const segs = yearChapter({ chart: c, year: 2026 })!.segments;
      const rest = segs.find((x) => x.slot === '四化')?.text.match(/化[祿權科忌]（在這一年的/g)?.length ?? 0;
      const inAreas = segs
        .filter((x) => ['工作', '錢', '感情', '心境'].includes(x.slot))
        .flatMap((x) => /；([^。]*)落在這裡/.exec(x.text)?.[1]?.split('、') ?? []).length;
      expect(rest + inAreas, segs.map((x) => x.text).join(' ')).toBe(4);
    }
  });

  it('分工作、錢、感情、心境四方面講，仲有一段建議', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const slots = yearChapter({ chart: c, year: 2026 })!.segments.map((x) => x.slot);
      expect(slots).toEqual(expect.arrayContaining(['工作', '錢', '感情', '心境', '建議']));
    }
  });

  it('互動句講嘅係「這一年」，唔會漏咗「這十年」嘅字眼', () => {
    for (const c of CHARTS) {
      const s = yearChapter({ chart: c, year: 2026 })!.segments.find((x) => x.slot === '互動');
      if (s) expect(s.text).not.toMatch(/這十年(又|卻)/);
    }
  });

  it('關鍵年份：只有流年命宮落正樞紐先講', () => {
    for (const c of CHARTS.slice(0, 200)) {
      const A = annual(c, 2026);
      if (!A.ok) continue;
      const rule = pivotRule(c, 'year');
      const mp = c.palaces.find((p) => p.branch === A.value.mingGong)!;
      const said = yearChapter({ chart: c, year: 2026 })!.segments[0]!.text.includes('關鍵年份');
      expect(said).toBe(rule?.isPivot(mp) ?? false);
    }
  });

  it('同一張盤、同一年兩次一樣；唔同年份講唔同嘅年', () => {
    const c = CHARTS[3]!;
    expect(yearChapter({ chart: c, year: 2026 })).toEqual(yearChapter({ chart: c, year: 2026 }));
    expect(yearChapter({ chart: c, year: 2027 })!.segments[0]!.text).toMatch(/丁未年/);
  });
});
