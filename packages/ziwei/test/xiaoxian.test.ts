/**
 * 小限 —— 《全書》卷二〈安小限訣〉，對照 iztro（2026-10-06）
 *
 *   「不論陰陽男俱順數，不論陰陽女俱逆數。
 *    寅午戌人起辰宮，申子辰人自戌宮，巳酉丑人起未宮，亥卯未人起丑宮。」
 *
 * iztro 係回歸基準（唔係裁決者）：佢每個宮有 `ages`（嗰宮行小限嘅虛歲）。
 */
import { describe, expect, it } from 'vitest';
import { astro } from 'iztro';
import { cast, sexOf, xiaoxian, type BirthInput } from '../src/index';

const CHARTS = 80;

type Case = { input: BirthInput; timeIndex: number; gender: '男' | '女' };

function makeCases(count: number): Case[] {
  let seed = 20261007;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  const out: Case[] = [];
  for (let i = 0; i < count; i++) {
    const ti = rnd(12);
    const gender = rnd(2) === 0 ? '男' : '女';
    out.push({
      timeIndex: ti,
      gender,
      input: {
        solar: { y: 1930 + rnd(70), m: 1 + rnd(12), d: 1 + rnd(28) },
        time: { h: (ti * 2) % 24, min: 0 },
        tz: 'Asia/Shanghai',
        place: { lng: 120, lat: 30, label: '東經 120 度' },
        sex: gender === '男' ? 'male' : 'female',
        options: { trueSolarTime: false },
      },
    });
  }
  return out;
}

describe(`小限同 iztro 對照（${CHARTS} 個盤 × 每宮所有歲數）`, () => {
  const diffs: string[] = [];
  let compared = 0;
  let sexWrong = 0;

  for (const c of makeCases(CHARTS)) {
    const r = cast(c.input);
    if (!r.ok) continue;
    if (sexOf(r.value) !== c.input.sex) sexWrong++;
    const a = astro.bySolar(`${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d}`, c.timeIndex, c.gender, true, 'zh-TW');
    for (const p of a.palaces) {
      for (const age of p.ages) {
        compared++;
        const ours = xiaoxian(r.value, age);
        if (ours !== p.earthlyBranch) diffs.push(`${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d} ${c.gender} 虛歲${age} 得「${ours}」iztro「${p.earthlyBranch}」`);
      }
    }
  }

  it('比到嘢', () => {
    expect(compared).toBeGreaterThan(CHARTS * 80);
  });

  it('冇任何差異', () => {
    expect(diffs.slice(0, 8)).toEqual([]);
  });

  it('由盤倒推嘅男女同輸入一樣', () => {
    expect(sexWrong).toBe(0);
  });
});

describe('〈安小限訣〉手計', () => {
  const at = (y: number, sex: 'male' | 'female') => {
    const r = cast({ solar: { y, m: 6, d: 15 }, time: { h: 12, min: 0 }, tz: 'Asia/Shanghai', place: { lng: 120, lat: 30, label: 'x' }, sex, options: { trueSolarTime: false } });
    if (!r.ok) throw new Error('cast');
    return r.value;
  };

  it('寅午戌年一歲喺辰；男順女逆', () => {
    /* 1990 庚午 */
    expect(xiaoxian(at(1990, 'male'), 1)).toBe('辰');
    expect(xiaoxian(at(1990, 'male'), 2)).toBe('巳');
    expect(xiaoxian(at(1990, 'female'), 2)).toBe('卯');
  });

  it('申子辰戌、巳酉丑未、亥卯未丑', () => {
    expect(xiaoxian(at(1984, 'male'), 1)).toBe('戌'); /* 甲子 */
    expect(xiaoxian(at(1981, 'female'), 1)).toBe('未'); /* 辛酉 */
    expect(xiaoxian(at(1987, 'male'), 1)).toBe('丑'); /* 丁卯 */
  });

  it('十三歲行返一歲嗰宮', () => {
    const c = at(1990, 'female');
    expect(xiaoxian(c, 13)).toBe(xiaoxian(c, 1));
    expect(() => xiaoxian(c, 0)).toThrow();
  });
});
