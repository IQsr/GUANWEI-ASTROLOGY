import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  MAJOR_STARS,
  PALACE_NAMES,
  TOMB_BRANCHES,
  cast,
  castPartial,
  mirrorAboutYinShen,
  type BirthInput,
  type Chart,
} from '../src/index';

/**
 * 工單 B11：十條結構性不變量。
 *
 * 呢十條唔使識睇盤都驗得到，而且成本最低、捉錯最多。
 * 安星偏移類嘅 bug，九成會喺呢度爆。
 */

const N = 10_000;

/** 決定性隨機：同一個 seed 永遠出同一批生辰，測試先可重現。 */
function makeInputs(count: number): BirthInput[] {
  let seed = 20260912;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  const out: BirthInput[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      solar: { y: 1901 + rnd(198), m: 1 + rnd(12), d: 1 + rnd(28) },
      time: { h: rnd(24), min: rnd(60) },
      tz: 'Asia/Shanghai',
      place: { lng: 120, lat: 30, label: '東經 120 度' },
      sex: rnd(2) === 0 ? 'male' : 'female',
    });
  }
  return out;
}

const INPUTS = makeInputs(N);
const CHARTS: Chart[] = [];
const FAILED: string[] = [];
for (const i of INPUTS) {
  const r = cast(i);
  if (r.ok) CHARTS.push(r.value);
  else FAILED.push(`${i.solar.y}-${i.solar.m}-${i.solar.d} → ${r.code}`);
}

const tag = (c: Chart) => `${c.lunar.y}/${c.lunar.m}/${c.lunar.d} 時${c.lunar.shichen}`;

/** 逐個盤行一次 check，收集失敗，最後先斷言一次（十萬個 expect 會 timeout）。 */
function checkAll(check: (c: Chart) => string | null): string[] {
  const bad: string[] = [];
  for (const c of CHARTS) {
    const msg = check(c);
    if (msg && bad.length < 5) bad.push(`${tag(c)}：${msg}`);
  }
  return bad;
}

describe(`十條不變量（${N.toLocaleString()} 個隨機生辰）`, () => {
  it(`全部排得出，一個都冇 fail`, () => {
    expect(FAILED.slice(0, 5)).toEqual([]);
    expect(CHARTS).toHaveLength(N);
  });

  it('01　十二宮地支各出現一次，冇重複冇缺', () => {
    expect(
      checkAll((c) => {
        const b = c.palaces.map((p) => p.branch);
        return b.length === 12 && new Set(b).size === 12 ? null : `地支 ${b.join('')}`;
      }),
    ).toEqual([]);
  });

  it('02　十四主星每粒剛好出現一次', () => {
    expect(
      checkAll((c) => {
        const names = c.palaces.flatMap((p) =>
          p.stars.filter((s) => s.kind === 'major').map((s) => s.name),
        );
        if (names.length !== 14 || new Set(names).size !== 14) return `主星 ${names.length} 粒`;
        for (const m of MAJOR_STARS) if (!names.includes(m)) return `缺 ${m}`;
        return null;
      }),
    ).toEqual([]);
  });

  it('03　紫微與天府關於寅申軸對稱', () => {
    expect(
      checkAll((c) => {
        const at = (n: string) =>
          c.palaces.findIndex((p) => p.stars.some((s) => s.name === n));
        const zi = at('紫微');
        const fu = at('天府');
        return fu === mirrorAboutYinShen(zi) ? null : `紫微${BRANCHES[zi]} 天府${BRANCHES[fu]}`;
      }),
    ).toEqual([]);
  });

  it('04　兩系內部相對間隔固定，同紫微落宮無關', () => {
    const shape = (c: Chart) => {
      const at = (n: string) => c.palaces.findIndex((p) => p.stars.some((s) => s.name === n));
      const rel = (base: string, names: string[]) =>
        names.map((n) => (((at(n) - at(base)) % 12) + 12) % 12).join(',');
      return [
        rel('紫微', ['天機', '太陽', '武曲', '天同', '廉貞']),
        rel('天府', ['太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']),
      ].join('|');
    };
    const first = shape(CHARTS[0]!);
    expect(checkAll((c) => (shape(c) === first ? null : shape(c)))).toEqual([]);
  });

  it('05　身宮只落命、夫妻、財帛、遷移、官祿、福德', () => {
    const allowed = new Set(['命宮', '夫妻', '財帛', '遷移', '官祿', '福德']);
    const seen = new Set<string>();
    const bad = checkAll((c) => {
      const shen = c.palaces.filter((p) => p.isShen);
      if (shen.length !== 1) return `身宮 ${shen.length} 個`;
      seen.add(shen[0]!.name);
      if (c.palaces.find((p) => p.branch === c.shenGong) !== shen[0]) return '身宮標記同 shenGong 唔一致';
      return allowed.has(shen[0]!.name) ? null : `身宮落 ${shen[0]!.name}`;
    });
    expect(bad).toEqual([]);
    expect(seen.size).toBe(6); // 六個都要出現過，唔係得一兩個
  });

  it('06　四化剛好四粒，祿權科忌各一', () => {
    expect(
      checkAll((c) => {
        const hua = c.palaces.flatMap((p) => p.stars.filter((s) => s.sihua));
        if (hua.length !== 4) return `四化 ${hua.length} 粒`;
        return new Set(hua.map((s) => s.sihua)).size === 4 ? null : '祿權科忌唔齊';
      }),
    ).toEqual([]);
  });

  it('07　擎羊、陀羅夾住祿存', () => {
    expect(
      checkAll((c) => {
        const at = (n: string) => c.palaces.findIndex((p) => p.stars.some((s) => s.name === n));
        const lu = at('祿存');
        if (at('擎羊') !== (lu + 1) % 12) return '擎羊唔喺祿存前一宮';
        return at('陀羅') === (lu + 11) % 12 ? null : '陀羅唔喺祿存後一宮';
      }),
    ).toEqual([]);
  });

  it('08　祿存唔落四墓宮（辰戌丑未）', () => {
    expect(
      checkAll((c) => {
        const lu = c.palaces.find((p) => p.stars.some((s) => s.name === '祿存'))!;
        return TOMB_BRANCHES.includes(lu.branch) ? `祿存落 ${lu.branch}` : null;
      }),
    ).toEqual([]);
  });

  it('09　大限十二段連續、無缺口無重疊，起運歲 = 局數', () => {
    expect(
      checkAll((c) => {
        if (c.decadals.length !== 12) return `大限 ${c.decadals.length} 段`;
        if (c.decadals[0]!.fromAge !== c.wuxingJu.n) return `起運 ${c.decadals[0]!.fromAge} ≠ 局數 ${c.wuxingJu.n}`;
        if (c.decadals[0]!.branch !== c.mingGong) return '第一段唔由命宮起';
        for (let i = 0; i < 12; i++) {
          if (c.decadals[i]!.toAge - c.decadals[i]!.fromAge !== 9) return `第${i + 1}段唔係十年`;
          if (i > 0 && c.decadals[i]!.fromAge !== c.decadals[i - 1]!.toAge + 1) return `第${i + 1}段唔連續`;
        }
        return new Set(c.decadals.map((d) => d.branch)).size === 12 ? null : '大限地支有重複';
      }),
    ).toEqual([]);
  });

  it('10　同一 input 跑一百次，輸出逐 byte 相同', () => {
    for (const i of INPUTS.slice(0, 20)) {
      const first = JSON.stringify(cast(i));
      for (let k = 0; k < 100; k++) {
        expect(JSON.stringify(cast(i))).toBe(first);
      }
    }
  });
});

describe('附加結構檢查', () => {
  it('十二宮名各一次，而且係標準嗰十二個', () => {
    expect(
      checkAll((c) => {
        const names = c.palaces.map((p) => p.name);
        if (new Set(names).size !== 12) return '宮名有重複';
        for (const n of names) if (!(PALACE_NAMES as readonly string[]).includes(n)) return `怪宮名 ${n}`;
        return null;
      }),
    ).toEqual([]);
  });

  it('每粒主星都有廟旺', () => {
    expect(
      checkAll((c) => {
        for (const p of c.palaces) {
          for (const s of p.stars) {
            if (s.kind === 'major' && !s.brightness) return `${s.name} 冇廟旺`;
          }
        }
        return null;
      }),
    ).toEqual([]);
  });

  it('meta 帶齊 engineVersion、rules、tablesChecksum', () => {
    const c = CHARTS[0]!;
    expect(c.meta.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(c.meta.tablesChecksum).toHaveLength(64);
    expect(c.meta.rules.yearBoundary).toBe('lunar-new-year');
    // 純函數：唔傳 computedAt 就唔應該有
    expect(c.meta.computedAt).toBeUndefined();
  });

  it('castPartial：冇時辰都出到年月日層，但冇宮位', () => {
    const { time: _t, ...rest } = INPUTS[0]!;
    const r = cast(INPUTS[0]!);
    const p = castPartial(rest);
    expect(p.ok).toBe(true);
    if (!p.ok || !r.ok) return;
    expect(p.value.ganzhi).not.toHaveProperty('hour');
    expect(p.value).not.toHaveProperty('palaces');
    expect(p.value.lunar.y).toBe(r.value.lunar.y);
  });
});
