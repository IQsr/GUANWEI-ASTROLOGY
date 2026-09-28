import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { BASE_BLOCKS } from '../src/baseblock-data';
import { gistOf, linkLine } from '../src/link';

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
    expect(line.text.startsWith('命宮與遷移宮正對')).toBe(true);
    expect(line.sources).toHaveLength(3);
    expect(line.text).toMatch(/在遷移宮，.+；在.+宮，.+；在.+宮，.+。$/);
  });

  it('唔再有「不是獨立看的」「單看一宮」呢類每本書一樣嘅句', () => {
    for (const p of chart.palaces) {
      const t = linkLine(chart, p)?.text ?? '';
      expect(t, p.name).not.toMatch(/獨立看|單看一宮|分開讀|要一起讀/);
    }
  });
});
