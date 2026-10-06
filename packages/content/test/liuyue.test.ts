/**
 * 〈這一年〉逐月（liuyue.ts · 2026-10-06）
 *
 * 讀法出處：《全書》卷二〈安斗君訣〉＋ 十二宮嘅「斗君過度」句。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, monthly, type BirthInput } from '@guanwei/ziwei';
import { yearChapter } from '../src/liunian';
import { LIUYUE, LIUYUE_LEAD, leapNote, monthLines, monthSegment } from '../src/liuyue';
import { LIUYUE_EN } from '../src/en/time';
import { renderParagraphs } from '../src/en/render';
import { scanForbidden } from '../src/lint';
import { scanEnglish } from '../src/en/lint';

const input = (y: number, m: number, d: number, h: number, sex: 'male' | 'female'): BirthInput => ({
  solar: { y, m, d },
  time: { h, min: 0 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex,
});

function sampleCharts(n: number) {
  const out = [];
  let seed = 11;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const r = cast(input(1950 + (seed % 55), 1 + (seed % 12), 1 + (seed % 28), seed % 24, seed % 2 ? 'male' : 'female'));
    if (r.ok) out.push(r.value);
  }
  return out;
}

describe('逐月', () => {
  const charts = sampleCharts(120);

  it('十二宮每宮兩句，全部有英文，而且過英文檢查', () => {
    expect(LIUYUE.map((e) => e.palace)).toHaveLength(12);
    for (const e of LIUYUE) {
      for (const zh of [e.good, e.bad]) {
        expect(LIUYUE_EN[zh], zh).toBeTruthy();
        expect(scanEnglish(LIUYUE_EN[zh]!), zh).toEqual([]);
      }
    }
  });

  it('〈這一年〉有逐月段，喺明年之前', () => {
    const ch = yearChapter({ chart: charts[0]!, year: 2026 })!;
    const slots = ch.segments.map((s) => s.slot);
    expect(slots).toContain('逐月');
    if (slots.includes('明年')) expect(slots.indexOf('逐月')).toBeLessThan(slots.indexOf('明年'));
  });

  it('列出嘅月份落喺流月命宮嗰個流年宮，而且按月份排', () => {
    for (const c of charts.slice(0, 40)) {
      const A = annual(c, 2026);
      if (!A.ok) continue;
      const lines = monthLines(c, A.value);
      expect(lines.map((l) => l.month)).toEqual([...lines.map((l) => l.month)].sort((a, b) => a - b));
      for (const l of lines) {
        const b = monthly(c, 2026, l.month).mingGong;
        expect(A.value.overlay.find((o) => o.branch === b)?.annual).toBe(l.palace);
      }
    }
  });

  it('唔會逐個月寫晒：大部份書列兩至五個月', () => {
    const counts = charts.map((c) => {
      const A = annual(c, 2026);
      return A.ok ? monthLines(c, A.value).length : 0;
    });
    expect(Math.max(...counts)).toBeLessThan(12);
    const mid = counts.filter((n) => n >= 1 && n <= 5).length / counts.length;
    expect(mid).toBeGreaterThan(0.6);
  });

  it('講將來：冇禁字', () => {
    for (const c of charts.slice(0, 40)) {
      const A = annual(c, 2026);
      if (!A.ok) continue;
      const seg = monthSegment(c, A.value);
      expect(scanForbidden(seg.text, 'body'), seg.text).toEqual([]);
    }
  });

  it('閏月照通行做法：上半月當本月，下半月當下一個月', () => {
    /* 2025 乙巳年閏六月；2026 冇閏月 */
    expect(leapNote(2025)).toBe('今年有閏六月：上半月照六月看，下半月照七月看。');
    expect(leapNote(2026)).toBe('');
  });

  it('英文：逐月段整段譯得到，冇漏句', () => {
    for (const c of charts.slice(0, 30)) {
      const A = annual(c, 2026);
      if (!A.ok) continue;
      const seg = monthSegment(c, A.value);
      const en = renderParagraphs([seg.text, leapNote(2025)]);
      expect(en.missing, seg.text).toEqual([]);
      if (seg.text.startsWith(LIUYUE_LEAD)) expect(en.paras[0]).toMatch(/^Month by month/);
    }
  });
});
