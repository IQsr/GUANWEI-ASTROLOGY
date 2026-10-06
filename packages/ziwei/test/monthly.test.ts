/**
 * 流月（斗君）—— 按《全書》卷二〈安斗君訣〉測（2026-10-06）
 *
 *   「於流年太歲宮起正月，逆至本生月，又從本生月起子順數至本生時安斗君。」
 *
 * ⚠ 唔用 iztro 對照：iztro ^2.6.1 嘅流月唔計出生時辰（docs/engine-divergence.md D-005）。
 * 所以呢度用手計例子，加幾條條訣本身推得出嘅規律。
 */
import { describe, expect, it } from 'vitest';
import { BRANCHES, cast, douJun, monthly, type BirthInput } from '../src/index';

const idx = (b: string) => BRANCHES.indexOf(b as (typeof BRANCHES)[number]);

const born = (h: number, solar = { y: 1972, m: 5, d: 17 }): BirthInput => ({
  solar,
  time: { h, min: 0 },
  tz: 'Asia/Shanghai',
  place: { lng: 120, lat: 30, label: '東經 120 度' },
  sex: 'male',
  options: { trueSolarTime: false },
});

function chartOf(input: BirthInput) {
  const r = cast(input);
  if (!r.ok) throw new Error(r.message);
  return r.value;
}

describe('手計例子（D-005 嗰張盤：1972-05-17，農曆四月初五）', () => {
  /* 1994 甲戌年：太歲戌宮起正月，逆數至四月 → 未 */
  it('子時：停喺未', () => {
    const c = chartOf(born(0));
    expect(c.lunar.m).toBe(4);
    expect(douJun(c, 1994)).toBe('未');
  });

  it('午時：由未順數六宮 → 丑', () => {
    expect(douJun(chartOf(born(12)), 1994)).toBe('丑');
  });

  it('流月命宮：正月喺斗君，三月順行兩宮', () => {
    const c = chartOf(born(0));
    expect(monthly(c, 1994, 1).mingGong).toBe('未');
    expect(monthly(c, 1994, 3).mingGong).toBe('酉');
  });
});

describe('條訣推得出嘅規律', () => {
  const c = chartOf(born(8, { y: 1990, m: 3, d: 21 }));

  it('流年多一年，斗君順行一宮（太歲順行）', () => {
    for (let y = 2000; y < 2012; y++) {
      expect((idx(douJun(c, y)) + 1) % 12).toBe(idx(douJun(c, y + 1)));
    }
  });

  it('生時遲一個時辰，斗君順行一宮', () => {
    const base = idx(douJun(chartOf(born(0, { y: 1990, m: 3, d: 21 })), 2026));
    for (let s = 1; s < 12; s++) {
      expect(idx(douJun(chartOf(born(s * 2, { y: 1990, m: 3, d: 21 })), 2026))).toBe((base + s) % 12);
    }
  });

  it('流月每月順行一宮；正月就係斗君', () => {
    const dj = douJun(c, 2026);
    for (let m = 1; m <= 12; m++) {
      expect(monthly(c, 2026, m).mingGong).toBe(BRANCHES[(idx(dj) + m - 1) % 12]);
    }
  });

  it('流月十二宮由流月命宮逆佈：流月命宮嗰格叫命宮，逆一格叫兄弟', () => {
    const m = monthly(c, 2026, 5);
    const at = (b: string) => m.palaces.find((p) => p.branch === b)!.name;
    expect(at(m.mingGong)).toBe('命宮');
    expect(at(BRANCHES[(idx(m.mingGong) + 11) % 12]!)).toBe('兄弟');
  });

  it('月份出界就掟錯，唔會靜靜雞計一個', () => {
    expect(() => monthly(c, 2026, 0)).toThrow();
    expect(() => monthly(c, 2026, 13)).toThrow();
    expect(() => monthly(c, 2026, 1.5)).toThrow();
  });
});
