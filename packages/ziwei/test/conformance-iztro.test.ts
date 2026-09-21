import { describe, expect, it } from 'vitest';
import { astro } from 'iztro';
import { AUX_STARS, cast, type BirthInput, type Chart } from '../src/index';

/**
 * 工單 B12：同 iztro 逐宮對照。
 *
 * iztro 喺呢度**唔係裁決者，只係回歸基準**（見 project doc《iztro 使用守則》）。
 * 我哋跟佢學過排盤規則，所以佢唔算獨立驗證 —— 佢嘅作用係：
 * 我哋改引擎嗰陣，如果唔小心改壞咗某一層，呢度會即刻爆。
 *
 * 真正嘅 ground truth 係書本例盤（工單 B5，未做）。
 *
 * 預期分歧全部列喺 KNOWN_DIVERGENCES，同 docs/engine-divergence.md 對應。
 * 出現任何唔喺名單入面嘅差異 = 測試 fail。
 */

const N = 1000;
const AUX = new Set<string>(AUX_STARS);

/** 已知同預期嘅分歧。每一項喺 docs/engine-divergence.md 有完整記錄。 */
const KNOWN_DIVERGENCES = [
  {
    id: 'D-001',
    field: 'sihua',
    when: (c: Chart) => c.ganzhi.year[0] === '庚',
    why: '庚干四化：本引擎用中州派（天府化科），iztro 用陸斌兆（太陰化科）。見 docs/rules.md R-003。',
  },
] as const;

type Case = { input: BirthInput; timeIndex: number; gender: '男' | '女' };

function makeCases(count: number): Case[] {
  let seed = 19981203;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  const out: Case[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1902 + rnd(195);
    const m = 1 + rnd(12);
    const d = 1 + rnd(28);
    const ti = rnd(12);
    const gender = rnd(2) === 0 ? '男' : '女';
    out.push({
      timeIndex: ti,
      gender,
      input: {
        solar: { y, m, d },
        // 時辰中點；子時取 00:00（早子時，唔進日）
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

/** 我哋由子宮起排，iztro 由寅宮起 —— 轉成同一個次序先可以比。 */
function fromYin<T>(arr: T[]): T[] {
  return arr.slice(2).concat(arr.slice(0, 2));
}

type Diff = { case: string; field: string; index: number; mine: string; theirs: string; yearStem: string };

describe(`同 iztro 逐宮對照（${N.toLocaleString()} 個盤）`, () => {
  const cases = makeCases(N);
  const diffs: Diff[] = [];
  let compared = 0;

  for (const c of cases) {
    const r = cast(c.input);
    if (!r.ok) {
      diffs.push({
        case: `${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d}`,
        field: 'cast',
        index: -1,
        mine: r.code,
        theirs: 'ok',
        yearStem: '?',
      });
      continue;
    }
    const mineChart = r.value;
    const a = astro.bySolar(
      `${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d}`,
      c.timeIndex,
      c.gender,
      true,
      'zh-TW',
    );
    compared++;
    const tag = `${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d} 時辰${c.timeIndex}${c.gender}`;
    const ys = mineChart.ganzhi.year[0];
    const push = (field: string, index: number, mine: string, theirs: string) => {
      if (mine !== theirs) diffs.push({ case: tag, field, index, mine, theirs, yearStem: ys });
    };

    push('wuxingJu', -1, mineChart.wuxingJu.name, a.fiveElementsClass);
    push('mingGong', -1, mineChart.mingGong, a.palaces.find((p) => p.name === '命宮')!.earthlyBranch);
    push('shenGong', -1, mineChart.shenGong, a.palaces.find((p) => p.isBodyPalace)!.earthlyBranch);

    const mine = fromYin(mineChart.palaces);
    for (let i = 0; i < 12; i++) {
      const mp = mine[i]!;
      const tp = a.palaces[i]!;
      push('branch', i, mp.branch, tp.earthlyBranch);
      push('palaceName', i, mp.name, tp.name);
      push('palaceStem', i, mp.stem, tp.heavenlyStem);
      push(
        'majorStars',
        i,
        mp.stars.filter((s) => s.kind === 'major').map((s) => `${s.name}${s.brightness ?? ''}`).join('·'),
        tp.majorStars.map((s) => `${s.name}${s.brightness || ''}`).join('·'),
      );
      push(
        'auxStars',
        i,
        mp.stars.filter((s) => AUX.has(s.name)).map((s) => s.name).sort().join('·'),
        tp.minorStars.filter((s) => AUX.has(s.name)).map((s) => s.name).sort().join('·'),
      );
      push(
        'sihua',
        i,
        mp.stars.filter((s) => s.sihua).map((s) => `${s.name}${s.sihua}`).sort().join('·'),
        [...tp.majorStars, ...tp.minorStars]
          .filter((s) => s.mutagen)
          .map((s) => `${s.name}${s.mutagen}`)
          .sort()
          .join('·'),
      );
      const d = mineChart.decadals.find((x) => x.branch === mp.branch)!;
      push('decadal', i, `${d.fromAge}-${d.toAge}`, tp.decadal.range.join('-'));
    }
  }

  const known = (d: Diff) =>
    KNOWN_DIVERGENCES.some((k) => k.field === d.field && d.yearStem === '庚');
  const unexpected = diffs.filter((d) => !known(d));
  const expected = diffs.filter(known);

  it(`${N.toLocaleString()} 個盤全部排得出`, () => {
    expect(compared).toBe(N);
  });

  it('冇任何未記錄嘅差異', () => {
    expect(
      unexpected.slice(0, 8).map((d) => `${d.case} ${d.field}[${d.index}] 得「${d.mine}」iztro「${d.theirs}」`),
    ).toEqual([]);
  });

  it('D-001 庚干四化：差異存在、而且只喺四化、只喺庚年', () => {
    expect(expected.length).toBeGreaterThan(0);
    expect(new Set(expected.map((d) => d.field))).toEqual(new Set(['sihua']));
    expect(new Set(expected.map((d) => d.yearStem))).toEqual(new Set(['庚']));
  });

  it('差異摘要（印出嚟，同 docs/engine-divergence.md 對照）', () => {
    const byField = new Map<string, number>();
    for (const d of diffs) byField.set(d.field, (byField.get(d.field) ?? 0) + 1);
    // eslint-disable-next-line no-console
    console.log(
      `\n  對照 ${compared} 個盤 × 每盤 ~99 項 ——\n` +
        `  未記錄差異：${unexpected.length}\n` +
        `  已記錄差異：${expected.length}（${[...byField].map(([f, n]) => `${f}=${n}`).join(' ')}）\n`,
    );
    expect(unexpected).toHaveLength(0);
  });
});
