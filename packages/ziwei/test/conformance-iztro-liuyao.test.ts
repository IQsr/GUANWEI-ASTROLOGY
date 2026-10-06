/**
 * 流昌、流曲、流魁、流鉞、流馬（連流祿羊陀）同 iztro 對照（2026-10-06）
 *
 * 《深造講義》p.323 講呢套流曜「主要用於推斷大運或流年之十二宮」，但冇寫安法；
 * 表跟通行做法。iztro 係回歸基準（唔係裁決者）：佢 `horoscope()` 嘅 yearly.stars（流X）
 * 同 decadal.stars（運X）逐宮列出呢幾粒。
 */
import { describe, expect, it } from 'vitest';
import { astro } from 'iztro';
import { annual, BRANCHES, cast, type BirthInput, type Branch, type FlowStars } from '../src/index';

const CHARTS = 50;
const YEARS = 4;

type Case = { input: BirthInput; timeIndex: number; gender: '男' | '女' };

function makeCases(count: number): Case[] {
  let seed = 20261008;
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
        solar: { y: 1935 + rnd(65), m: 1 + rnd(12), d: 1 + rnd(28) },
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

/* iztro 嘅宮由寅起排 */
const fromYin = (i: number): Branch => BRANCHES[(i + 2) % 12]!;

const NAMES: [keyof FlowStars, string, string][] = [
  ['祿存', '流祿', '運祿'],
  ['擎羊', '流羊', '運羊'],
  ['陀羅', '流陀', '運陀'],
  ['文昌', '流昌', '運昌'],
  ['文曲', '流曲', '運曲'],
  ['天魁', '流魁', '運魁'],
  ['天鉞', '流鉞', '運鉞'],
  ['天馬', '流馬', '運馬'],
];

function where(stars: { name: string }[][], name: string): Branch | null {
  const i = stars.findIndex((p) => p.some((s) => s.name === name));
  return i < 0 ? null : fromYin(i);
}

describe(`流曜同 iztro 對照（${CHARTS} 個盤 × ${YEARS} 年 × 流年、大限兩套）`, () => {
  const diffs: string[] = [];
  let compared = 0;

  for (const c of makeCases(CHARTS)) {
    const r = cast(c.input);
    if (!r.ok) continue;
    const a = astro.bySolar(`${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d}`, c.timeIndex, c.gender, true, 'zh-TW');
    for (let k = 0; k < YEARS; k++) {
      const y = r.value.lunar.y + 12 + k * 13;
      if (y > 2095) continue;
      const A = annual(r.value, y);
      if (!A.ok) continue;
      const h = a.horoscope(`${y}-06-15`);
      for (const [key, liu, yun] of NAMES) {
        compared++;
        const theirs = where(h.yearly.stars as { name: string }[][], liu);
        if (theirs !== A.value.liuyao.annual[key]) diffs.push(`${y} ${liu} 得「${A.value.liuyao.annual[key]}」iztro「${theirs}」`);
        if (A.value.liuyao.decadal) {
          const t2 = where(h.decadal.stars as { name: string }[][], yun);
          if (t2 !== A.value.liuyao.decadal[key]) diffs.push(`${y} ${yun} 得「${A.value.liuyao.decadal[key]}」iztro「${t2}」`);
        }
      }
    }
  }

  it('比到嘢', () => {
    expect(compared).toBeGreaterThan(CHARTS * YEARS * 5);
  });

  it('冇任何差異', () => {
    expect(diffs.slice(0, 8)).toEqual([]);
  });
});
