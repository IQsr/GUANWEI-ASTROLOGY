import { describe, expect, it } from 'vitest';
import oracle from './fixtures/palace-oracle.json';
import {
  BRANCHES,
  PALACE_NAMES,
  mingGongBranchIndex,
  monthForPalace,
  resolvePalaces,
  shenGongBranchIndex,
  type BirthInput,
  type ShichenIndex,
} from '../src/index';

function inputFor(c: { solar: number[]; shichen: number }): BirthInput {
  const [y, m, d] = c.solar as [number, number, number];
  return {
    solar: { y, m, d },
    // 時辰中點：子時取 00:00（早子時，唔會進日）
    time: { h: (c.shichen * 2) % 24, min: 0 },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: 'male',
    options: { trueSolarTime: false },
  };
}

describe('安命宮 / 安身宮', () => {
  it('正月子時生，命宮在寅', () => {
    expect(BRANCHES[mingGongBranchIndex(1, 0)]).toBe('寅');
  });

  it('正月生，時辰逐個逆數一格', () => {
    const got = [0, 1, 2, 3].map((s) => BRANCHES[mingGongBranchIndex(1, s as ShichenIndex)]);
    expect(got).toEqual(['寅', '丑', '子', '亥']);
  });

  it('命身兩宮永遠相差偶數格', () => {
    for (let m = 1; m <= 12; m++) {
      for (let s = 0; s < 12; s++) {
        const diff = (shenGongBranchIndex(m, s as ShichenIndex) - mingGongBranchIndex(m, s as ShichenIndex) + 12) % 12;
        expect(diff % 2).toBe(0);
      }
    }
  });

  it('閏月：上半月算本月，下半月算下月', () => {
    expect(monthForPalace(8, 15, true)).toBe(8);
    expect(monthForPalace(8, 16, true)).toBe(9);
    expect(monthForPalace(8, 16, false)).toBe(8);
  });
});

describe('不變量', () => {
  const inputs: BirthInput[] = [];
  let seed = 20260912;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  for (let i = 0; i < 3000; i++) {
    inputs.push({
      solar: { y: 1901 + rnd(198), m: 1 + rnd(12), d: 1 + rnd(28) },
      time: { h: rnd(24), min: rnd(60) },
      tz: 'Asia/Shanghai',
      place: { lng: 120, lat: 30, label: '東經 120 度' },
      sex: rnd(2) === 0 ? 'male' : 'female',
    });
  }

  it('不變量 01：十二宮地支各出現一次，冇重複冇缺', () => {
    const bad: string[] = [];
    for (const i of inputs) {
      const r = resolvePalaces(i);
      if (!r.ok) {
        bad.push(`${i.solar.y}-${i.solar.m}-${i.solar.d} → ${r.code}`);
        continue;
      }
      const branches = r.value.layout.palaces.map((p) => p.branch);
      if (new Set(branches).size !== 12 || branches.length !== 12) {
        bad.push(`${i.solar.y}-${i.solar.m}-${i.solar.d} 地支唔齊：${branches.join('')}`);
      }
      const names = r.value.layout.palaces.map((p) => p.name);
      if (new Set(names).size !== 12) {
        bad.push(`${i.solar.y}-${i.solar.m}-${i.solar.d} 宮名唔齊：${names.join('')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('不變量 05：身宮只落命、夫妻、財帛、遷移、官祿、福德', () => {
    const allowed = new Set(['命宮', '夫妻', '財帛', '遷移', '官祿', '福德']);
    const seen = new Set<string>();
    const bad: string[] = [];
    for (const i of inputs) {
      const r = resolvePalaces(i);
      if (!r.ok) continue;
      const shen = r.value.layout.palaces.find((p) => p.isShen);
      expect(shen).toBeDefined();
      if (!allowed.has(shen!.name)) {
        bad.push(`${i.solar.y}-${i.solar.m}-${i.solar.d} 身宮落 ${shen!.name}`);
      }
      seen.add(shen!.name);
    }
    expect(bad).toEqual([]);
    // 六個都要出現過，唔係得一兩個
    expect(seen.size).toBe(6);
  });

  it('身宮剛好一個', () => {
    for (const i of inputs.slice(0, 500)) {
      const r = resolvePalaces(i);
      if (!r.ok) continue;
      expect(r.value.layout.palaces.filter((p) => p.isShen)).toHaveLength(1);
    }
  });

  it('十二宮名一定係標準嗰十二個', () => {
    const r = resolvePalaces(inputs[0]!);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const p of r.value.layout.palaces) {
      expect(PALACE_NAMES as readonly string[]).toContain(p.name);
    }
  });

  it('五行局一定係五個之一，局數 2–6', () => {
    for (const i of inputs.slice(0, 800)) {
      const r = resolvePalaces(i);
      if (!r.ok) continue;
      expect([2, 3, 4, 5, 6]).toContain(r.value.layout.wuxingJu.n);
    }
  });

  it('子丑兩宮嘅天干同寅卯一樣（十二宮十天干必然重複兩個）', () => {
    const r = resolvePalaces(inputs[0]!);
    if (!r.ok) return;
    const by = Object.fromEntries(r.value.layout.palaces.map((p) => [p.branch, p.stem]));
    expect(by['子']).toBe(by['寅']);
    expect(by['丑']).toBe(by['卯']);
  });
});

describe(`對照 iztro（${oracle.cases.length} 個）`, () => {
  it('命宮、身宮、五行局、十二宮干支全對', () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) {
        bad.push(`${c.solar.join('-')} 時辰${c.shichen} → ${r.code}`);
        continue;
      }
      const L = r.value.layout;
      const tag = `${c.solar.join('-')} 時辰${c.shichen}`;
      if (L.mingGong !== c.mingGong) bad.push(`${tag} 命宮 ${L.mingGong} ≠ ${c.mingGong}`);
      if (L.shenGong !== c.shenGong) bad.push(`${tag} 身宮 ${L.shenGong} ≠ ${c.shenGong}`);
      if (L.wuxingJu.name !== c.ju) bad.push(`${tag} 五行局 ${L.wuxingJu.name} ≠ ${c.ju}`);
      const ming = L.palaces.find((p) => p.name === '命宮')!;
      if (ming.stem !== c.mingGongStem) bad.push(`${tag} 命宮天干 ${ming.stem} ≠ ${c.mingGongStem}`);
      // iztro 由寅宮起排
      const mine = L.palaces
        .slice(2)
        .concat(L.palaces.slice(0, 2))
        .map((p) => `${p.name}${p.stem}${p.branch}`);
      const theirs = (c.palaces as string[]).map((x) => x.replace('僕役', '僕役'));
      if (mine.join(' ') !== theirs.join(' ')) {
        bad.push(`${tag}\n    得 ${mine.join(' ')}\n    應 ${theirs.join(' ')}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
