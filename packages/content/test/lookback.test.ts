import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { lookBack, lifeStepsChapter } from '../src/daxian';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';

/**
 * 回看過去（2026-10-02 · 一生十二步，免費章）
 *
 * 讀者見到對得上嘅過去年份，之後嘅講法先容易接受。
 * ⚠ 只講年份 × 方面，唔講事件、唔講病、唔講意外（冇流羊流陀，推唔到細節；講錯一次信任就冇）。
 */
const CHARTS = Array.from({ length: 200 }, (_, i) => {
  const r = cast({
    solar: { y: 1950 + ((i * 7) % 60), m: 1 + ((i * 5) % 12), d: 1 + ((i * 11) % 28) },
    time: { h: (i * 3) % 24, min: 20 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  return r.ok ? r.value : null;
}).filter((x) => x !== null);

const yearsOf = (text: string) => [...text.matchAll(/虛歲([〇一二三四五六七八九十百]+)）/g)].length;

describe('回看過去', () => {
  it('大部分人都有；最多三年', () => {
    const got = CHARTS.map((c) => lookBack(c, 2026));
    expect(got.filter(Boolean).length / CHARTS.length).toBeGreaterThan(0.85);
    for (const s of got) if (s) expect(yearsOf(s.text)).toBeLessThanOrEqual(3);
  });

  it('只講過去（寫書嗰年之前）、虛歲十八之後', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      for (const m of s.text.matchAll(/([〇一二三四五六七八九]{4})年前後/g)) {
        const y = Number([...m[1]!].map((d) => '〇一二三四五六七八九'.indexOf(d)).join(''));
        expect(y).toBeLessThan(2026);
        expect(y - c.lunar.y + 1).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it('唔講事件、唔講病、唔講意外；過禁用詞同直白檢查', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      expect(s.text).not.toMatch(/病|意外|手術|受傷|官非|破財|離婚|死/);
      expect(scanForbidden(s.text, 'body')).toEqual([]);
      expect(scanPlain(s.text, '回看')).toEqual([]);
    }
  });

  it('擺喺一生十二步嘅結論之後', () => {
    const c = CHARTS.find((x) => lookBack(x, 2026))!;
    const slots = lifeStepsChapter({ chart: c, year: 2026 })!.segments.map((s) => s.slot);
    expect(slots.slice(0, 2)).toEqual(['結論', '回看']);
  });
});
