import { describe, expect, it } from 'vitest';
import oracle from './fixtures/aux-star-oracle.json';
import {
  AUX_STARS,
  BRANCHES,
  STEMS,
  TOMB_BRANCHES,
  lucunBranchIndex,
  placeAuxStars,
  qingyangBranchIndex,
  resolvePalaces,
  tuoluoBranchIndex,
  type BirthInput,
  type Branch,
  type ShichenIndex,
  type Stem,
} from '../src/index';

function inputFor(c: { solar: number[]; shichen: number; gender: string }): BirthInput {
  const [y, m, d] = c.solar as [number, number, number];
  return {
    solar: { y, m, d },
    time: { h: (c.shichen * 2) % 24, min: 0 },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: c.gender === '男' ? 'male' : 'female',
    options: { trueSolarTime: false },
  };
}

describe('祿存同羊陀', () => {
  it('八個祿存位置：甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子', () => {
    const expected: Record<string, string> = {
      甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
      己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
    };
    for (const s of STEMS) {
      expect(BRANCHES[lucunBranchIndex(s)]).toBe(expected[s]);
    }
  });

  it('不變量 07：擎羊、陀羅永遠夾住祿存', () => {
    for (const s of STEMS) {
      const lu = lucunBranchIndex(s);
      expect(qingyangBranchIndex(s)).toBe((lu + 1) % 12);
      expect(tuoluoBranchIndex(s)).toBe((lu + 11) % 12);
    }
  });

  it('不變量 08：祿存永遠唔落四墓宮（辰戌丑未）', () => {
    for (const s of STEMS) {
      expect(TOMB_BRANCHES).not.toContain(BRANCHES[lucunBranchIndex(s)] as Branch);
    }
  });
});

describe('十四粒輔星煞星', () => {
  it('全部 17,280 個 年干 × 年支 × 月 × 時辰 組合都排得出，十四粒齊', () => {
    // 用純 JS 累積，最後先斷言一次 —— 二十幾萬個 expect() 會慢到 timeout。
    const AUX = new Set<string>(AUX_STARS);
    const bad: string[] = [];
    let n = 0;
    for (const ys of STEMS) {
      for (const yb of BRANCHES) {
        for (let m = 1; m <= 12; m++) {
          for (let sc = 0; sc < 12; sc++) {
            n++;
            const r = placeAuxStars({
              yearStem: ys as Stem,
              yearBranch: yb as Branch,
              lunarMonth: m,
              shichen: sc as ShichenIndex,
            });
            if (!r.ok) {
              if (bad.length < 5) bad.push(`${ys}${yb} ${m}月 時辰${sc} → ${r.code}`);
              continue;
            }
            const names = r.value.map((x) => x.name);
            if (names.length !== 14 || new Set(names).size !== 14 || !names.every((x) => AUX.has(x))) {
              if (bad.length < 5) bad.push(`${ys}${yb} ${m}月 時辰${sc} → ${names.join('·')}`);
            }
          }
        }
      }
    }
    // 年干支實際得六十個合法組合，呢度連唔合法嘅都掃埋，
    // 目的係確保冇任何輸入會令佢爆。
    expect(n).toBe(10 * 12 * 12 * 12);
    expect(bad).toEqual([]);
  });

  it('不變量 07 喺完整盤上面都成立（羊陀夾祿存）', () => {
    for (const c of oracle.cases.slice(0, 150)) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) continue;
      const find = (name: string) =>
        r.value.layout.palaces.findIndex((p) => p.stars.some((s) => s.name === name));
      const lu = find('祿存');
      expect(find('擎羊')).toBe((lu + 1) % 12);
      expect(find('陀羅')).toBe((lu + 11) % 12);
    }
  });

  it('不變量 08 喺完整盤上面都成立（祿存唔落四墓）', () => {
    for (const c of oracle.cases.slice(0, 150)) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) continue;
      const lu = r.value.layout.palaces.find((p) => p.stars.some((s) => s.name === '祿存'))!;
      expect(TOMB_BRANCHES).not.toContain(lu.branch);
    }
  });

  it('地空地劫永遠關於亥宮對稱', () => {
    for (let s = 0; s < 12; s++) {
      const r = placeAuxStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 1, shichen: s as ShichenIndex });
      if (!r.ok) continue;
      const kong = r.value.find((x) => x.name === '地空')!.branchIndex;
      const jie = r.value.find((x) => x.name === '地劫')!.branchIndex;
      expect((kong + jie) % 12).toBe((11 + 11) % 12);
    }
  });

  it('天馬只可能落四馬地（寅申巳亥）', () => {
    for (const yb of BRANCHES) {
      const r = placeAuxStars({ yearStem: '甲', yearBranch: yb, lunarMonth: 1, shichen: 0 });
      if (!r.ok) continue;
      const ma = r.value.find((x) => x.name === '天馬')!;
      expect(['寅', '申', '巳', '亥']).toContain(ma.branch);
    }
  });
});

describe(`對照 iztro（${oracle.cases.length} 個，男女各半）`, () => {
  it('十四粒輔星煞星落宮全對', () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) {
        bad.push(`${c.solar.join('-')} 時辰${c.shichen} → ${r.code}`);
        continue;
      }
      const AUX = new Set<string>(AUX_STARS);
      const mine = r.value.layout.palaces
        .slice(2)
        .concat(r.value.layout.palaces.slice(0, 2))
        .map((p) => p.stars.filter((s) => AUX.has(s.name)).map((s) => s.name).sort().join('·'));
      const theirs = c.aux as string[];
      for (let i = 0; i < 12; i++) {
        if (mine[i] !== theirs[i]) {
          bad.push(
            `${c.solar.join('-')} 時辰${c.shichen} ${c.gender} 第${i + 1}格 得「${mine[i]}」應「${theirs[i]}」`,
          );
          break;
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
