/**
 * 工單 C2 —— 觸發條件語言
 *
 * 測試分兩半：
 *   前半　每個原子行唔行得
 *   後半　**「查唔到」有冇被當成「冇」** —— 呢半重要好多
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { evaluate, type Condition, type EvalContext } from '../src/index';

const mk = (over: Partial<BirthInput> = {}): Chart => {
  const r = cast({
    solar: { y: 1996, m: 6, d: 16 },
    time: { h: 8, min: 30 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'male',
    ...over,
  });
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

const CHART = mk();
const A = annual(CHART, 2026);
if (!A.ok) throw new Error('annual failed');
const FULL: EvalContext = { chart: CHART, annual: A.value };
const NATAL: EvalContext = { chart: CHART };

const run = (c: Condition, ctx: EvalContext = FULL) => evaluate(c, ctx);

/** 搵返某粒星實際坐邊個宮名，等測試唔使寫死。 */
const palaceOfStar = (star: string) =>
  CHART.palaces.find((p) => p.stars.some((s) => s.name === star))!;

describe('原子', () => {
  it('{star, in}：星坐宮', () => {
    const p = palaceOfStar('紫微');
    const hit = run({ star: '紫微', in: { name: p.name } });
    expect(hit.status).toBe('matched');
    if (hit.status !== 'matched') return;
    expect(hit.bindings[0]!.star).toBe('紫微');
    expect(hit.bindings[0]!.branch).toBe(p.branch);
    expect(hit.bindings[0]!.note).toContain('紫微');

    const other = CHART.palaces.find((q) => q.name !== p.name && !q.stars.some((s) => s.name === '紫微'))!;
    expect(run({ star: '紫微', in: { name: other.name } }).status).toBe('unmatched');
  });

  it('{star, brightness}：廟旺', () => {
    const p = palaceOfStar('紫微');
    const s = p.stars.find((x) => x.name === '紫微')!;
    expect(run({ star: '紫微', brightness: [s.brightness!] }).status).toBe('matched');
    const others = (['廟', '旺', '得', '利', '平', '不', '陷'] as const).filter((b) => b !== s.brightness);
    expect(run({ star: '紫微', brightness: [...others] }).status).toBe('unmatched');
  });

  it('{brightnessIn}：唔指名邊粒星，問成個宮', () => {
    const all = run({ brightnessIn: { name: '命宮' }, levels: ['廟', '旺', '得', '利', '平', '不', '陷'] });
    const ming = CHART.palaces.find((p) => p.name === '命宮')!;
    const hasMajor = ming.stars.some((s) => s.kind === 'major');
    expect(all.status).toBe(hasMajor ? 'matched' : 'unmatched');
  });

  it('{hua, in}：某個化落某個宮', () => {
    const jiStar = CHART.palaces.flatMap((p) => p.stars.filter((s) => s.sihua === '忌').map((s) => ({ p, s })))[0]!;
    const hit = run({ hua: '忌', in: { name: jiStar.p.name }, layer: 'natal' });
    expect(hit.status).toBe('matched');
    if (hit.status !== 'matched') return;
    expect(hit.bindings[0]!.hua).toBe('忌');
    expect(hit.bindings[0]!.star).toBe(jiStar.s.name);
  });

  it('{star, hua}：某粒星化某', () => {
    const luStar = CHART.palaces.flatMap((p) => p.stars.filter((s) => s.sihua === '祿'))[0]!;
    expect(run({ star: luStar.name, hua: '祿' }).status).toBe('matched');
    expect(run({ star: luStar.name, hua: '忌' }).status).toBe('unmatched');
  });

  it('{empty}：空宮', () => {
    const empties = CHART.palaces.filter((p) => !p.stars.some((s) => s.kind === 'major'));
    for (const p of empties) {
      const hit = run({ empty: { name: p.name } });
      expect(hit.status, p.name).toBe('matched');
      if (hit.status === 'matched') expect(hit.bindings[0]!.note).toContain('借對宮');
    }
    const full = CHART.palaces.find((p) => p.stars.some((s) => s.kind === 'major'))!;
    expect(run({ empty: { name: full.name } }).status).toBe('unmatched');
  });

  it('{sanfangOf, contains} 同 {sanfangOf, count}', () => {
    const ming = CHART.palaces.find((p) => p.name === '命宮')!;
    const inSanfang = ['命宮', '財帛', '遷移', '官祿'];
    const star = CHART.palaces
      .filter((p) => inSanfang.includes(p.name))
      .flatMap((p) => p.stars)[0]!;
    expect(run({ sanfangOf: { name: '命宮' }, contains: star.name }).status).toBe('matched');
    expect(run({ sanfangOf: { name: '命宮' }, count: 'malefic', op: 'gte', n: 0 }).status).toBe('matched');
    expect(run({ sanfangOf: { name: '命宮' }, count: 'malefic', op: 'gte', n: 99 }).status).toBe('unmatched');
    expect(ming).toBeTruthy();
  });

  it('{together} 同 {opposite}', () => {
    // 紫微同天府永遠喺固定關係，攞佢哋同宮嘅實際情況嚟試
    const zi = palaceOfStar('紫微');
    const withZi = zi.stars.filter((s) => s.name !== '紫微')[0];
    if (withZi) expect(run({ together: ['紫微', withZi.name] }).status).toBe('matched');
    expect(run({ together: ['紫微', '__唔存在嘅星__'] }).status).toBe('unmatched');

    const opp = CHART.palaces.find((p) => {
      const i = CHART.palaces.indexOf(p);
      const j = CHART.palaces.indexOf(zi);
      return (((i - j) % 12) + 12) % 12 === 6;
    })!;
    const oppStar = opp.stars[0];
    if (oppStar) expect(run({ opposite: ['紫微', oppStar.name] }).status).toBe('matched');
  });

  it('流年層：{hua, in, layer: "annual"} 用流年宮名', () => {
    const jiHit = A.value.sihua.annual.find((h) => h.hua === '忌')!;
    const hit = run({ hua: '忌', in: { name: jiHit.annualPalace!, layer: 'annual' }, layer: 'annual' });
    expect(hit.status).toBe('matched');
    if (hit.status !== 'matched') return;
    expect(hit.bindings[0]!.layer).toBe('annual');
    expect(hit.bindings[0]!.palace).toBe(jiHit.annualPalace);
    expect(hit.bindings[0]!.note).toContain('流年');
  });
});

describe('組合子', () => {
  it('all：一個唔中就唔中', () => {
    const p = palaceOfStar('紫微');
    expect(run({ all: [{ star: '紫微', in: { name: p.name } }, { star: '紫微', brightness: ['廟', '旺', '得', '利', '平', '不', '陷'] }] }).status).toBe('matched');
    expect(run({ all: [{ star: '紫微', in: { name: p.name } }, { star: '紫微', brightness: [] as never }] }).status).toBe('unmatched');
  });

  it('all 會收集晒所有 binding', () => {
    const p = palaceOfStar('紫微');
    const hit = run({ all: [{ star: '紫微', in: { name: p.name } }, { star: '紫微', brightness: ['廟', '旺', '得', '利', '平', '不', '陷'] }] });
    if (hit.status !== 'matched') throw new Error('should match');
    expect(hit.bindings.length).toBe(2);
  });

  it('any：一個中就中', () => {
    const p = palaceOfStar('紫微');
    expect(run({ any: [{ star: '紫微', in: { name: p.name } }, { star: '__冇__', in: { name: p.name } }] }).status).toBe('matched');
  });

  it('not：中變唔中', () => {
    const p = palaceOfStar('紫微');
    expect(run({ not: { star: '紫微', in: { name: p.name } } }).status).toBe('unmatched');
    expect(run({ not: { star: '__冇__', in: { name: p.name } } }).status).toBe('matched');
  });
});

describe('⚠「查唔到」唔准變成「冇」', () => {
  const annualCond: Condition = { hua: '忌', in: { name: '官祿', layer: 'annual' }, layer: 'annual' };

  it('冇流年資料 → not_applicable，唔係 unmatched', () => {
    const r = run(annualCond, NATAL);
    expect(r.status).toBe('not_applicable');
  });

  it('not 包住一個 not_applicable，仍然係 not_applicable —— 唔准變 matched', () => {
    const r = run({ not: annualCond }, NATAL);
    expect(r.status).toBe('not_applicable');
  });

  it('all 入面有 not_applicable → 成條 not_applicable', () => {
    const p = palaceOfStar('紫微');
    const r = run({ all: [{ star: '紫微', in: { name: p.name } }, annualCond] }, NATAL);
    expect(r.status).toBe('not_applicable');
  });

  /**
   * any 最陰濕：兩條分支，一條查過冇、一條查唔到。
   * 如果當成 unmatched，就等於話「兩樣都冇」—— 但第二樣根本冇查過。
   */
  it('any：一條 unmatched 一條 not_applicable → not_applicable', () => {
    const r = run({ any: [{ star: '__冇__', in: { name: '命宮' } }, annualCond] }, NATAL);
    expect(r.status).toBe('not_applicable');
    if (r.status === 'not_applicable') expect(r.reason).toContain('流年');
  });

  it('any：有一條真係中咗，就唔理其他查唔查得到', () => {
    const p = palaceOfStar('紫微');
    const r = run({ any: [{ star: '紫微', in: { name: p.name } }, annualCond] }, NATAL);
    expect(r.status).toBe('matched');
  });

  it('未起運：要大限層嘅條件出 not_applicable', () => {
    const young = annual(CHART, 1997);
    if (!young.ok) throw new Error('fail');
    expect(young.value.decadal).toBeNull();
    const r = run({ hua: '忌', in: { name: '命宮', layer: 'decade' }, layer: 'decade' },
      { chart: CHART, annual: young.value });
    expect(r.status).toBe('not_applicable');
  });
});

describe('純函數', () => {
  it('同一條條件跑一百次，結果逐 byte 相同', () => {
    const c: Condition = { sanfangOf: { name: '命宮' }, count: 'malefic', op: 'gte', n: 1 };
    const first = JSON.stringify(run(c));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(run(c))).toBe(first);
  });

  it('條件係純資料 —— JSON 兜一個圈仲行得', () => {
    const c: Condition = { all: [{ star: '紫微', in: { name: palaceOfStar('紫微').name } }] };
    const viaJson = JSON.parse(JSON.stringify(c)) as Condition;
    expect(JSON.stringify(run(viaJson))).toBe(JSON.stringify(run(c)));
  });
});
