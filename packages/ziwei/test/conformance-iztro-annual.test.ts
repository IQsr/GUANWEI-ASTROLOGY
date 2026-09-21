/**
 * 工單 B15 —— 流年層同 iztro 對照。
 *
 * 同 B12 一樣：iztro **唔係裁決者，只係回歸基準**。
 * 佢喺呢度嘅價值係「我改流年層嗰陣，如果改壞咗會即刻爆」。
 *
 * 逐個盤 × 逐年比三樣：
 *   流年命宮（太歲地支所在宮）
 *   流年十二宮名（由流年命宮逆佈）
 *   流年四化四粒星
 * 加埋大限嗰層：大限宮干、大限四化、大限十二宮名。
 *
 * 預期分歧：庚年生嘅人生年四化唔同（D-001），
 * 同埋**任何一層撞正庚干**都會有四化分歧 —— 大限宮干係庚、或者流年天干係庚。
 * 呢個係 D-001 嘅直接後果，唔係新嘢。
 */
import { describe, expect, it } from 'vitest';
import { astro } from 'iztro';
import { annual, cast, type BirthInput } from '../src/index';

const CHARTS = 120;
const YEARS_PER_CHART = 8;

type Case = { input: BirthInput; timeIndex: number; gender: '男' | '女' };

function makeCases(count: number): Case[] {
  let seed = 20260913;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  const out: Case[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1930 + rnd(70);
    const m = 1 + rnd(12);
    const d = 1 + rnd(28);
    const ti = rnd(12);
    const gender = rnd(2) === 0 ? '男' : '女';
    out.push({
      timeIndex: ti,
      gender,
      input: {
        solar: { y, m, d },
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

function fromYin<T>(arr: T[]): T[] {
  return arr.slice(2).concat(arr.slice(0, 2));
}

type Diff = { case: string; field: string; mine: string; theirs: string; geng: boolean };

describe(`流年層同 iztro 對照（${CHARTS} 個盤 × ${YEARS_PER_CHART} 年）`, () => {
  const diffs: Diff[] = [];
  let compared = 0;
  let decadalCompared = 0;

  for (const c of makeCases(CHARTS)) {
    const r = cast(c.input);
    if (!r.ok) continue;
    const mine = r.value;
    const a = astro.bySolar(
      `${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d}`,
      c.timeIndex,
      c.gender,
      true,
      'zh-TW',
    );

    for (let k = 0; k < YEARS_PER_CHART; k++) {
      // 由虛歲 10 起，每七年一格 —— 保證跨過幾個大限
      const lunarYear = mine.lunar.y + 9 + k * 7;
      if (lunarYear > 2098) continue;
      const mineAnnual = annual(mine, lunarYear);
      if (!mineAnnual.ok) continue;

      // iztro 用農曆日期入 horoscope，避開年界問題：取該農曆年五月十五
      const h = a.horoscope(`${lunarYear}-06-15`);
      const tag = `${c.input.solar.y}-${c.input.solar.m}-${c.input.solar.d} → ${lunarYear}`;
      const gengHere =
        mine.ganzhi.year[0] === '庚' ||
        mineAnnual.value.ganzhi[0] === '庚' ||
        mineAnnual.value.decadal?.stem === '庚';
      const push = (field: string, m: string, t: string) => {
        if (m !== t) diffs.push({ case: tag, field, mine: m, theirs: t, geng: gengHere });
      };

      compared++;
      push('流年命宮', mineAnnual.value.mingGong, h.yearly.earthlyBranch);
      push('流年天干', mineAnnual.value.ganzhi[0], h.yearly.heavenlyStem);
      push(
        '流年十二宮',
        fromYin(mineAnnual.value.overlay).map((o) => o.annual).join(','),
        h.yearly.palaceNames.join(','),
      );
      push('流年四化', mineAnnual.value.sihua.annual.map((x) => x.star).join(','), h.yearly.mutagen.join(','));

      if (mineAnnual.value.decadal) {
        decadalCompared++;
        push('大限地支', mineAnnual.value.decadal.branch, h.decadal.earthlyBranch);
        push('大限宮干', mineAnnual.value.decadal.stem, h.decadal.heavenlyStem);
        push(
          '大限十二宮',
          fromYin(mineAnnual.value.overlay).map((o) => o.decadal ?? '').join(','),
          h.decadal.palaceNames.join(','),
        );
        push('大限四化', mineAnnual.value.sihua.decadal!.map((x) => x.star).join(','), h.decadal.mutagen.join(','));
      }
    }
  }

  const unexpected = diffs.filter((d) => !(d.geng && d.field.endsWith('四化')));
  const expected = diffs.filter((d) => d.geng && d.field.endsWith('四化'));

  it('比到嘢 —— 流年同大限兩層都有樣本', () => {
    expect(compared).toBeGreaterThan(CHARTS * 5);
    expect(decadalCompared).toBeGreaterThan(CHARTS * 5);
  });

  it('冇任何未記錄嘅差異', () => {
    expect(
      unexpected.slice(0, 8).map((d) => `${d.case} ${d.field} 得「${d.mine}」iztro「${d.theirs}」`),
    ).toEqual([]);
  });

  /**
   * 庚干一撞就分歧 —— 但而家佢有三個入口：生年、大限宮干、流年天干。
   * 本命盤嗰陣只有一個。呢個係 D-001 嘅放大，唔係新分歧。
   */
  it('D-001 喺流年層放大：生年、大限宮干、流年天干三個入口都會撞到庚', () => {
    expect(expected.length).toBeGreaterThan(0);
    expect(new Set(expected.map((d) => d.field))).toEqual(new Set(['流年四化', '大限四化']));
  });

  it('差異摘要', () => {
    const byField = new Map<string, number>();
    for (const d of diffs) byField.set(d.field, (byField.get(d.field) ?? 0) + 1);
    // eslint-disable-next-line no-console
    console.log(
      `\n  流年對照 ${compared} 個 (盤 × 年)，其中 ${decadalCompared} 個有大限 ——\n` +
        `  未記錄差異：${unexpected.length}\n` +
        `  已記錄差異：${expected.length}（${[...byField].map(([f, n]) => `${f}=${n}`).join(' ')}）\n`,
    );
    expect(unexpected).toHaveLength(0);
  });
});
