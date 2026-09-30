import { describe, expect, it } from 'vitest';
import { cast, sihuaOfStem, STEMS } from '@guanwei/ziwei';
import { DAXIAN_HUA, decadeChapter, lifeStepsChapter } from '../src/daxian';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';
import { withoutCitations } from '../src/lexicon';

/** 大限兩章（2026-09-30）：出處喺 daxian.ts 開頭 */

let seed = 20260930;
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
  .map((r) => (r as { ok: true; value: Parameters<typeof decadeChapter>[0]['chart'] }).value);

describe('大限四化：十干每一化都有講法', () => {
  it('中州派四化表嘅四十個位，逐個有一句', () => {
    const miss: string[] = [];
    for (const s of STEMS) {
      const t = sihuaOfStem(s)!;
      for (const h of ['祿', '權', '科', '忌'] as const) {
        if (!DAXIAN_HUA.some((e) => e.star === t[h] && e.hua === h)) miss.push(`${s}${t[h]}化${h}`);
      }
    }
    expect(miss).toEqual([]);
  });
});

describe('兩章', () => {
  it('四百張盤都砌得出，段段過 lint、冇講方法冇列條件', () => {
    for (const c of CHARTS) {
      for (const ch of [lifeStepsChapter({ chart: c, year: 2026 }), decadeChapter({ chart: c, year: 2026 })]) {
        expect(ch, c.mingGong).not.toBeNull();
        for (const s of ch!.segments) {
          expect(scanForbidden(withoutCitations(s.text), 'body'), `${ch!.slug}/${s.slot}：${s.text}`).toEqual([]);
          expect(scanPlain(s.text, s.slot), s.text).toEqual([]);
        }
        expect(scanPlain(ch!.segments[0]!.text, '結論', { leadsWithConclusion: true }), ch!.segments[0]!.text).toEqual([]);
      }
    }
  });

  it('十二步齊，而且標住寫書嗰陣行到邊步', () => {
    const c = CHARTS[0]!;
    const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
    expect(ch.segments.filter((s) => s.slot === '步')).toHaveLength(12);
    expect(ch.segments.filter((s) => s.text.includes('寫這本書時，你在這一步')).length).toBeLessThanOrEqual(1);
  });

  it('這十年：大限四化四句都講到，而且講明落喺呢十年邊宮', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const s = decadeChapter({ chart: c, year: 2026 })!.segments.find((x) => x.slot === '四化')!;
      expect(s.text.match(/化[祿權科忌]（在這十年的/g)?.length, s.text).toBe(4);
    }
  });

  it('未起運（剛出世）都有章，講第一個大限幾時開始', () => {
    const r = cast({ solar: { y: 2025, m: 12, d: 1 }, time: { h: 10, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
    if (!r.ok) throw new Error('排唔到');
    const ch = decadeChapter({ chart: r.value, year: 2026 })!;
    expect(ch.segments[0]!.text).toMatch(/第一個大限從虛歲.+歲開始/);
  });

  it('同一張盤、同一年，兩次一樣；唔同年份講唔同嘅十年', () => {
    const c = CHARTS[1]!;
    expect(decadeChapter({ chart: c, year: 2026 })).toEqual(decadeChapter({ chart: c, year: 2026 }));
    expect(decadeChapter({ chart: c, year: 2026 })!.segments[0]!.text).not.toBe(decadeChapter({ chart: c, year: 2046 })!.segments[0]!.text);
  });

  it('冇阿拉伯數字（書入面一律中文數字）', () => {
    for (const c of CHARTS.slice(0, 50)) {
      for (const ch of [lifeStepsChapter({ chart: c, year: 2026 })!, decadeChapter({ chart: c, year: 2026 })!]) {
        for (const s of ch.segments) expect(s.text).not.toMatch(/\d/);
      }
    }
  });
});
