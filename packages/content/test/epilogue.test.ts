import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { epilogueChapter, EPILOGUE_SLUG } from '../src/epilogue';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';

/**
 * 給你的話（2026-10-02）：書尾總結。冇新主張，每句都係書入面已經有嘅句，只係揀同排。
 */
let seed = 20261002;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};
const CHARTS = Array.from({ length: 200 }, (_, i) => {
  const r = cast({
    solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  return r.ok ? r.value : null;
}).filter((x) => x !== null);

describe('給你的話', () => {
  it('每本書都有，長處三樣、留意三樣', () => {
    for (const c of CHARTS) {
      const ch = epilogueChapter({ chart: c, year: 2026 })!;
      expect(ch.slug).toBe(EPILOGUE_SLUG);
      const t = (slot: string) => ch.segments.find((s) => s.slot === slot)!.text;
      expect(t('長處').match(/[一二三]、/g)).toHaveLength(3);
      expect(t('留意').match(/[一二三]、/g)).toHaveLength(3);
    }
  });

  it('同一句唔會喺長處或者留意入面出兩次', () => {
    for (const c of CHARTS) {
      const ch = epilogueChapter({ chart: c, year: 2026 })!;
      for (const slot of ['長處', '留意']) {
        const items = ch.segments.find((s) => s.slot === slot)!.text.split(/[一二三]、/).slice(1);
        expect(new Set(items).size, items.join('|')).toBe(items.length);
      }
    }
  });

  it('過禁用詞同直白檢查；第一句就係結論', () => {
    for (const c of CHARTS) {
      const ch = epilogueChapter({ chart: c, year: 2026 })!;
      expect(scanPlain(ch.segments[0]!.text, '結論', { leadsWithConclusion: true })).toEqual([]);
      for (const s of ch.segments) {
        expect(scanForbidden(s.text, 'body'), s.text).toEqual([]);
        expect(scanPlain(s.text, s.slot), s.text).toEqual([]);
      }
    }
  });
});
