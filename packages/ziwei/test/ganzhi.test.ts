import { describe, expect, it } from 'vitest';
import oracle from './fixtures/ganzhi-oracle.json';
import {
  JU_BY_ELEMENT,
  NAYIN,
  indexFromPillar,
  nayinOfPillar,
  pillarFromIndex,
  pillarText,
  resolveFourPillars,
  yinPalaceStem,
  ziHourStemIndex,
  type BirthInput,
} from '../src/index';

/** Oracle 嘅前提：唔做真太陽時（cnlunar 用鐘面時間）。 */
function inputFor(c: { solar: number[]; clock: number[] }): BirthInput {
  const [y, m, d] = c.solar as [number, number, number];
  const [h, min] = c.clock as [number, number];
  return {
    solar: { y, m, d },
    time: { h, min },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: 'male',
    options: { trueSolarTime: false },
  };
}

describe('六十甲子', () => {
  it('0 = 甲子，59 = 癸亥', () => {
    expect(pillarText(pillarFromIndex(0))).toBe('甲子');
    expect(pillarText(pillarFromIndex(59))).toBe('癸亥');
  });

  it('六十個干支各唯一，而且循環', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(pillarText(pillarFromIndex(i)));
    expect(seen.size).toBe(60);
    expect(pillarText(pillarFromIndex(60))).toBe('甲子');
  });

  it('干支互轉一致', () => {
    for (let i = 0; i < 60; i++) {
      const p = pillarFromIndex(i);
      expect(indexFromPillar(p.stem, p.branch)).toBe(i);
    }
  });

  it('唔配對嘅干支回 null（甲只可以配陽支）', () => {
    expect(indexFromPillar('甲', '丑')).toBeNull();
  });
});

describe('五虎遁 / 五鼠遁', () => {
  it.each([
    ['甲', '丙'], ['己', '丙'],
    ['乙', '戊'], ['庚', '戊'],
    ['丙', '庚'], ['辛', '庚'],
    ['丁', '壬'], ['壬', '壬'],
    ['戊', '甲'], ['癸', '甲'],
  ])('五虎遁：%s 年 → 寅宮 %s', (yearStem, expected) => {
    expect(yinPalaceStem(yearStem as never)).toBe(expected);
  });

  it.each([
    ['甲', 0], ['己', 0], ['乙', 2], ['庚', 2],
    ['丙', 4], ['辛', 4], ['丁', 6], ['壬', 6],
    ['戊', 8], ['癸', 8],
  ])('五鼠遁：%s 日 → 子時干序 %d', (dayStem, expected) => {
    expect(ziHourStemIndex(dayStem as never)).toBe(expected);
  });
});

describe('納音', () => {
  it('三十對，每對兩個干支共用', () => {
    expect(NAYIN).toHaveLength(30);
    expect(nayinOfPillar({ stem: '甲', branch: '子' })!.name).toBe('海中金');
    expect(nayinOfPillar({ stem: '乙', branch: '丑' })!.name).toBe('海中金');
    expect(nayinOfPillar({ stem: '癸', branch: '亥' })!.name).toBe('大海水');
  });

  it('五行局齊全，局數 2–6', () => {
    expect(Object.keys(JU_BY_ELEMENT)).toHaveLength(5);
    expect(JU_BY_ELEMENT['水'].n).toBe(2);
    expect(JU_BY_ELEMENT['火'].n).toBe(6);
    const ns = Object.values(JU_BY_ELEMENT).map((j) => j.n).sort();
    expect(ns).toEqual([2, 3, 4, 5, 6]);
  });

  it('每個納音嘅五行都喺五個之內', () => {
    for (let i = 0; i < 60; i++) {
      expect(['金', '木', '水', '火', '土']).toContain(nayinOfPillar(pillarFromIndex(i))!.element);
    }
  });
});

describe(`四柱對照 cnlunar（${oracle.cases.length} 個）`, () => {
  it('全部一致', () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolveFourPillars(inputFor(c));
      if (!r.ok) {
        bad.push(`${c.solar.join('-')} ${c.clock.join(':')} → ${r.code}`);
        continue;
      }
      const got = [
        pillarText(r.value.pillars.year),
        pillarText(r.value.pillars.month),
        pillarText(r.value.pillars.day),
        pillarText(r.value.pillars.hour),
      ];
      if (got.join(' ') !== (c.pillars as string[]).join(' ')) {
        bad.push(`${c.solar.join('-')} ${c.clock.join(':')} 得 ${got.join(' ')} 應為 ${(c.pillars as string[]).join(' ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('農曆亦一致（晚子時個案除外）', () => {
    // cnlunar 報嘅農曆日係「鐘面嗰日」，但佢嘅日柱已經進咗位。
    // 本引擎兩樣都用進位後嗰日 —— 因為安紫微要用農曆日，
    // 如果農曆日唔跟住進位，日柱同農曆日就會指住唔同嘅一日（R-002）。
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolveFourPillars(inputFor(c));
      if (!r.ok) continue;
      if (r.value.moment.dayShift !== 0) continue;
      const got = [r.value.lunar.y, r.value.lunar.m, r.value.lunar.d, r.value.lunar.isLeapMonth];
      if (JSON.stringify(got) !== JSON.stringify(c.lunar)) {
        bad.push(`${c.solar.join('-')} 得 ${JSON.stringify(got)} 應為 ${JSON.stringify(c.lunar)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('晚子時：農曆日同日柱一齊進位，唔會各指一日', () => {
    const late = resolveFourPillars({
      solar: { y: 2025, m: 6, d: 1 },
      time: { h: 23, min: 30 },
      tz: 'Asia/Shanghai',
      place: { lng: 120, lat: 30, label: '東經 120 度' },
      sex: 'male',
      options: { trueSolarTime: false },
    });
    expect(late.ok).toBe(true);
    if (!late.ok) return;
    expect(late.value.moment.dayShift).toBe(1);
    expect(late.value.moment.solarDate).toEqual({ y: 2025, m: 6, d: 2 });
    // 日柱同農曆日都係 6月2日嗰一日
    expect(pillarText(late.value.pillars.day)).toBe('壬寅');
    expect(late.value.lunar.d).toBe(7);
  });
});

describe('年界 option 切換得到', () => {
  // 2024：立春 2月4日，正月初一 2月10日。2月5日喺兩者之間。
  const between: BirthInput = {
    solar: { y: 2024, m: 2, d: 5 },
    time: { h: 12, min: 0 },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: 'male',
    options: { trueSolarTime: false },
  };

  it('預設（正月初一）：仍然係癸卯年', () => {
    const r = resolveFourPillars(between);
    expect(r.ok).toBe(true);
    if (r.ok) expect(pillarText(r.value.pillars.year)).toBe('癸卯');
  });

  it('切去立春：變成甲辰年', () => {
    const r = resolveFourPillars({
      ...between,
      options: { ...between.options, yearBoundary: 'lichun' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(pillarText(r.value.pillars.year)).toBe('甲辰');
  });

  it('立春之前：兩個設定都係癸卯', () => {
    const before = { ...between, solar: { y: 2024, m: 2, d: 3 } };
    const a = resolveFourPillars(before);
    const b = resolveFourPillars({ ...before, options: { ...before.options, yearBoundary: 'lichun' } });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(pillarText(a.value.pillars.year)).toBe('癸卯');
      expect(pillarText(b.value.pillars.year)).toBe('癸卯');
    }
  });

  it('正月初一之後：兩個設定都係甲辰', () => {
    const after = { ...between, solar: { y: 2024, m: 2, d: 11 } };
    const a = resolveFourPillars(after);
    const b = resolveFourPillars({ ...after, options: { ...after.options, yearBoundary: 'lichun' } });
    if (a.ok && b.ok) {
      expect(pillarText(a.value.pillars.year)).toBe('甲辰');
      expect(pillarText(b.value.pillars.year)).toBe('甲辰');
    }
  });
});

describe('決定性', () => {
  it('同一個 input 跑一百次，四柱完全相同', () => {
    const i = inputFor(oracle.cases[0] as never);
    const first = JSON.stringify(resolveFourPillars(i));
    for (let k = 0; k < 100; k++) {
      expect(JSON.stringify(resolveFourPillars(i))).toBe(first);
    }
  });
});
