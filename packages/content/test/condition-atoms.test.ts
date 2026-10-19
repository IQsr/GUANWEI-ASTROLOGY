import { describe, expect, it } from 'vitest';
import { annual, cast, type Chart } from '@guanwei/ziwei';
import { evaluate, GEJU_DEF, type Condition, type GejuName } from '../src/condition';
import { ConditionSchema } from '../src/rule';

/*
 * 2026-10-19 條件卡原子：meets／flow／deLu／geju。
 * 冇書本例盤可以逐張對，所以驗三樣：同既有原子一致、命中率合理、schema 收得落。
 */
let seed = 20261019;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};
const CHARTS: Chart[] = [];
for (let i = 0; CHARTS.length < 1500; i++) {
  const r = cast({
    solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  if (r.ok) CHARTS.push(r.value);
}
const hit = (c: Condition, chart: Chart) => evaluate(c, { chart }).status === 'matched';
const rate = (c: Condition) => CHARTS.filter((ch) => hit(c, ch)).length / CHARTS.length;

describe('meets：同既有原子一致', () => {
  it('同度見 = together', () => {
    for (const ch of CHARTS) expect(hit({ meets: '紫微', stars: ['天府'], reach: 'same' }, ch)).toBe(hit({ together: ['紫微', '天府'] }, ch));
  });
  it('左右夾兩粒 = between', () => {
    for (const ch of CHARTS) {
      const a = hit({ all: [{ meets: '天相', stars: ['巨門'], reach: 'jia' }, { meets: '天相', stars: ['天梁'], reach: 'jia' }] }, ch);
      expect(a).toBe(hit({ star: '天相', between: ['巨門', '天梁'] }, ch) || (a && hit({ together: ['巨門', '天梁'] }, ch)));
    }
  });
  it('天相永遠夾喺巨門、天梁之間（原文 p.30「凡天相，其相鄰兩宮必分別為巨門及天梁」）', () => {
    for (const ch of CHARTS) expect(hit({ meets: '天相', stars: ['巨門', '天梁'], reach: 'jia', n: 2 }, ch)).toBe(true);
  });
  it('「化X」計本命四化', () => {
    for (const ch of CHARTS.slice(0, 200)) {
      const ji = ch.palaces.find((p) => p.stars.some((s) => s.sihua === '忌'))!;
      const anchor = ji.stars.find((s) => s.kind === 'major') ?? ji.stars[0]!;
      expect(hit({ meets: anchor.name, stars: ['化忌'], reach: 'same' }, ch)).toBe(true);
    }
  });
});

describe('flow：流曜', () => {
  it('流年擎羊入本命命宮大約十二分一（入流年命宮由年干支定死，唔適合抽樣）', () => {
    let n = 0, tot = 0;
    for (const ch of CHARTS.slice(0, 300))
      for (const y of [2026, 2027, 2028]) {
        const a = annual(ch, y);
        if (!a.ok) continue;
        tot++;
        if (evaluate({ flow: '擎羊', layer: 'annual', in: { name: '命宮' } }, { chart: ch, annual: a.value }).status === 'matched') n++;
      }
    expect(n / tot).toBeGreaterThan(0.04);
    expect(n / tot).toBeLessThan(0.14);
  });
  it('冇流年資料 → not_applicable，唔係 unmatched', () => {
    expect(evaluate({ flow: '擎羊', layer: 'annual', in: { name: '命宮' } }, { chart: CHARTS[0]! }).status).toBe('not_applicable');
  });
});

describe('geju：命名格局', () => {
  it('每個格局都有盤中、都有盤唔中', () => {
    const rates: Record<string, number> = {};
    for (const g of Object.keys(GEJU_DEF) as GejuName[]) rates[g] = rate({ geju: g });
    for (const [g, r] of Object.entries(rates)) {
      expect(r, `${g} 命中率 ${r}`).toBeGreaterThan(0);
      expect(r, `${g} 命中率 ${r}`).toBeLessThan(1);
    }
  });
  it('在野孤君同百官朝拱唔會同時成立', () => {
    for (const ch of CHARTS) expect(hit({ geju: 'zaiye' }, ch) && hit({ geju: 'baiguan' }, ch)).toBe(false);
  });
  it('得祿嘅天府唔係空庫（除非同地空）', () => {
    for (const ch of CHARTS)
      if (hit({ deLu: '天府' }, ch) && !hit({ meets: '天府', stars: ['地空'], reach: 'same' }, ch)) expect(hit({ geju: 'kongku' }, ch)).toBe(false);
  });
});

describe('schema 收得落新原子', () => {
  it('四種新原子都 parse 得', () => {
    for (const c of [
      { meets: '紫微', stars: ['左輔'], reach: 'jia', n: 1 },
      { flow: '擎羊', layer: 'decade', in: { name: '命宮', layer: 'decade' } },
      { deLu: '天府', layer: 'annual' },
      { geju: 'caiyin' },
    ])
      expect(ConditionSchema.safeParse(c).success, JSON.stringify(c)).toBe(true);
    for (const g of Object.values(GEJU_DEF)) expect(ConditionSchema.safeParse(g.when).success, g.name).toBe(true);
  });
});

describe('at／decadeOrder／decadeAge／天刑', () => {
  it('at：星坐邊個地支', () => {
    for (const ch of CHARTS.slice(0, 300)) {
      const b = ch.palaces.find((p) => p.stars.some((s) => s.name === '巨門'))!.branch;
      expect(hit({ star: '巨門', at: [b] }, ch)).toBe(true);
      expect(hit({ star: '巨門', at: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].filter((x) => x !== b) }, ch)).toBe(false);
    }
  });
  it('天刑：at 同 meets 都睇得到（唔喺 palaces[].stars）', () => {
    for (const ch of CHARTS.slice(0, 300)) {
      const p = ch.palaces.find((q) => hit({ star: '天刑', at: [q.branch] }, ch));
      expect(p).toBeDefined();
      const major = p!.stars.find((s) => s.kind === 'major');
      if (major) expect(hit({ meets: major.name, stars: ['天刑'], reach: 'same' }, ch)).toBe(true);
    }
  });
  it('大限順逆：大約一半一半，兩者互斥', () => {
    const f = rate({ decadeOrder: 'forward' });
    expect(f).toBeGreaterThan(0.4);
    expect(f).toBeLessThan(0.6);
    for (const ch of CHARTS.slice(0, 200)) expect(hit({ decadeOrder: 'forward' }, ch)).not.toBe(hit({ decadeOrder: 'backward' }, ch));
  });
  it('decadeAge：跟行緊嘅大限', () => {
    const ch = CHARTS[0]!;
    const a = annual(ch, ch.lunar.y + 24)!;
    if (!a.ok || !a.value.decadal) return;
    const from = a.value.decadal.fromAge;
    expect(evaluate({ decadeAge: { gte: from, lt: from + 1 } }, { chart: ch, annual: a.value }).status).toBe('matched');
    expect(evaluate({ decadeAge: { lt: from } }, { chart: ch, annual: a.value }).status).toBe('unmatched');
  });
});
