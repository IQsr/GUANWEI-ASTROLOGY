import { describe, expect, it } from 'vitest';
import oracle from './fixtures/major-star-oracle.json';
import {
  BRANCHES,
  MAJOR_STARS,
  mirrorAboutYinShen,
  placeMajorStars,
  resolvePalaces,
  tianfuBranchIndex,
  ziweiBranchIndex,
  ziweiStepFromYin,
  type BirthInput,
  type WuxingJu,
} from '../src/index';

const JU: WuxingJu[] = [
  { name: '水二局', n: 2 },
  { name: '木三局', n: 3 },
  { name: '金四局', n: 4 },
  { name: '土五局', n: 5 },
  { name: '火六局', n: 6 },
];

function inputFor(c: { solar: number[]; shichen: number }): BirthInput {
  const [y, m, d] = c.solar as [number, number, number];
  return {
    solar: { y, m, d },
    time: { h: (c.shichen * 2) % 24, min: 0 },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: 'male',
    options: { trueSolarTime: false },
  };
}

describe('定紫微星', () => {
  it('金四局廿三日：計出第 5 格，紫微在午（引擎 plan §5 嘅實例）', () => {
    const ju: WuxingJu = { name: '金四局', n: 4 };
    expect(ziweiStepFromYin(ju, 23)).toBe(5);
    expect(BRANCHES[ziweiBranchIndex(ju, 23)]).toBe('午');
    expect(BRANCHES[tianfuBranchIndex(ju, 23)]).toBe('戌');
  });

  it('整除個案：水二局十四日 → 紫微天府同在申', () => {
    const ju: WuxingJu = { name: '水二局', n: 2 };
    expect(BRANCHES[ziweiBranchIndex(ju, 14)]).toBe('申');
    expect(BRANCHES[tianfuBranchIndex(ju, 14)]).toBe('申');
  });

  it('每個局數、每一日都排得出（1–30 日 × 五個局）', () => {
    for (const ju of JU) {
      for (let d = 1; d <= 30; d++) {
        const r = placeMajorStars(ju, d);
        expect(r.ok).toBe(true);
      }
    }
  });

  it('農曆日超出 1–30 回 OUT_OF_RANGE，唔 throw', () => {
    expect(() => placeMajorStars(JU[0]!, 31)).not.toThrow();
    const r = placeMajorStars(JU[0]!, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('OUT_OF_RANGE');
  });
});

describe('不變量 02 / 03 / 04', () => {
  it('不變量 02：十四主星每粒剛好出現一次（五局 × 三十日 全掃）', () => {
    for (const ju of JU) {
      for (let d = 1; d <= 30; d++) {
        const r = placeMajorStars(ju, d);
        if (!r.ok) throw new Error('排唔到');
        const names = r.value.map((s) => s.name);
        expect(names).toHaveLength(14);
        expect(new Set(names).size).toBe(14);
        for (const n of MAJOR_STARS) expect(names).toContain(n);
      }
    }
  });

  it('不變量 03：紫微同天府永遠關於寅—申軸對稱', () => {
    for (const ju of JU) {
      for (let d = 1; d <= 30; d++) {
        const zi = ziweiBranchIndex(ju, d);
        const fu = tianfuBranchIndex(ju, d);
        expect(fu).toBe(mirrorAboutYinShen(zi));
      }
    }
  });

  it('不變量 04：兩系內部嘅相對間隔固定，同紫微落宮無關', () => {
    const shape = (ju: WuxingJu, d: number) => {
      const r = placeMajorStars(ju, d);
      if (!r.ok) throw new Error('排唔到');
      const by = Object.fromEntries(r.value.map((s) => [s.name, s.branchIndex]));
      const rel = (base: string, names: string[]) =>
        names.map((n) => (((by[n]! - by[base]!) % 12) + 12) % 12).join(',');
      return [
        rel('紫微', ['天機', '太陽', '武曲', '天同', '廉貞']),
        rel('天府', ['太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']),
      ].join(' | ');
    };
    const first = shape(JU[0]!, 1);
    for (const ju of JU) {
      for (let d = 1; d <= 30; d++) {
        expect(shape(ju, d)).toBe(first);
      }
    }
  });

  it('紫微天府同宮，就一定喺寅或者申', () => {
    for (const ju of JU) {
      for (let d = 1; d <= 30; d++) {
        const zi = ziweiBranchIndex(ju, d);
        if (zi === tianfuBranchIndex(ju, d)) {
          expect(['寅', '申']).toContain(BRANCHES[zi]);
        }
      }
    }
  });
});

describe(`對照 iztro（${oracle.cases.length} 個）`, () => {
  it('十二宮嘅主星落宮全對', () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) {
        bad.push(`${c.solar.join('-')} 時辰${c.shichen} → ${r.code}`);
        continue;
      }
      if (r.value.layout.wuxingJu.name !== c.ju) {
        bad.push(`${c.solar.join('-')} 五行局 ${r.value.layout.wuxingJu.name} ≠ ${c.ju}`);
        continue;
      }
      // iztro 由寅宮起排，我哋由子宮起
      const mine = r.value.layout.palaces
        .slice(2)
        .concat(r.value.layout.palaces.slice(0, 2))
        .map((p) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name).join('·'));
      const theirs = c.stars as string[];
      for (let i = 0; i < 12; i++) {
        if (mine[i] !== theirs[i]) {
          bad.push(`${c.solar.join('-')} 時辰${c.shichen} 第${i + 1}格 得「${mine[i]}」應「${theirs[i]}」`);
          break;
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('每個盤都齊十四主星', () => {
    for (const c of oracle.cases.slice(0, 100)) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) continue;
      const all = r.value.layout.palaces.flatMap((p) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name));
      expect(all).toHaveLength(14);
      expect(new Set(all).size).toBe(14);
    }
  });
});
