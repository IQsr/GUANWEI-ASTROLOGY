import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { annual, cast, BRANCHES } from '@guanwei/ziwei';
import { yearChapter, decadeChapter } from '@guanwei/content';
import { chartLayers } from '@/lib/layers.server';
import { defaultLayer, hasLayer, layerMingIndex, layerOf } from '@/lib/layers';
import { chartStateAt } from '@/lib/suidu';

/**
 * 命盤三層（本命／大限／流年）
 *
 * 個盤疊出嚟嘅層，要同〈這十年〉〈這一年〉兩章講嘅係同一年、同一格。
 */

const castOf = (y: number) => {
  const r = cast({
    solar: { y, m: 6, d: 16 },
    time: { h: 8, min: 30 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'male',
  });
  if (!r.ok) throw new Error(r.code);
  return r.value;
};
const CHART = castOf(1996);

describe('chartLayers', () => {
  const L = chartLayers(CHART, 2026)!;
  const A = (() => {
    const r = annual(CHART, 2026);
    if (!r.ok) throw new Error(r.code);
    return r.value;
  })();

  it('流年命宮同宮名跟引擎', () => {
    expect(L.annual.ming).toBe(A.mingGong);
    expect(L.annual.names[A.mingGong]).toBe('命宮');
    expect(Object.keys(L.annual.names)).toHaveLength(12);
    expect(L.ganzhi).toBe(A.ganzhi.join(''));
    expect(L.nominalAge).toBe(31);
  });

  it('大限命宮就係大限所在嗰格，歲數跟本命大限', () => {
    expect(L.decadal).not.toBeNull();
    expect(L.decadal!.names[L.decadal!.ming]).toBe('命宮');
    expect(L.nominalAge).toBeGreaterThanOrEqual(L.decadal!.fromAge);
    expect(L.nominalAge).toBeLessThanOrEqual(L.decadal!.toAge);
  });

  it('每層四組四化齊，而且同章入面講嗰四粒星一樣', () => {
    for (const l of [L.annual, L.decadal!]) {
      expect(new Set(Object.values(l.sihua))).toEqual(new Set(['祿', '權', '科', '忌']));
    }
    const text = yearChapter({ chart: CHART, year: 2026 })!.segments.map((s) => s.text).join('');
    for (const [star, hua] of Object.entries(L.annual.sihua)) expect(text).toContain(`${star}化${hua}`);
    const dtext = decadeChapter({ chart: CHART, year: 2026 })!.segments.map((s) => s.text).join('');
    for (const [star, hua] of Object.entries(L.decadal!.sihua)) expect(dtext).toContain(`${star}化${hua}`);
  });

  it('未起運冇大限層，大限掣唔出，〈這十年〉打開停喺本命', () => {
    const baby = chartLayers(castOf(2025), 2026)!;
    expect(baby.decadal).toBeNull();
    expect(hasLayer(baby, 'decadal')).toBe(false);
    expect(hasLayer(baby, 'annual')).toBe(true);
    expect(defaultLayer('這十年', baby)).toBe('natal');
  });

  it('出世之前冇流年', () => {
    expect(chartLayers(CHART, 1990)).toBeNull();
  });
});

describe('揀層', () => {
  const L = chartLayers(CHART, 2026);

  it('〈這一年〉開流年、〈這十年〉開大限、其餘本命', () => {
    expect(defaultLayer('這一年', L)).toBe('annual');
    expect(defaultLayer('這十年', L)).toBe('decadal');
    expect(defaultLayer('命宮', L)).toBe('natal');
    expect(defaultLayer('這一年', null)).toBe('natal');
  });

  it('本命層冇疊層；冇 layers 只得本命', () => {
    expect(layerOf(L, 'natal')).toBeNull();
    expect(hasLayer(null, 'annual')).toBe(false);
    expect(hasLayer(null, 'natal')).toBe(true);
  });

  it('〈這一年〉跟讀亮流年命宮，唔係亮空', () => {
    const at = layerMingIndex(L, 'annual');
    expect(at).toBe(BRANCHES.indexOf(L!.annual.ming));
    expect(chartStateAt(CHART, '這一年', '流年', at)).toEqual({ selected: at, relations: false });
    expect(chartStateAt(CHART, '這一年', '留白', at).selected).toBeNull();
    expect(chartStateAt(CHART, '這十年', '大限', layerMingIndex(L, 'decadal')).selected).toBe(
      BRANCHES.indexOf(L!.decadal!.ming),
    );
  });
});

describe('邊界', () => {
  it('layers.ts 唔 import 引擎總入口（client 用）', () => {
    const src = readFileSync(new URL('../src/lib/layers.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/from '@guanwei\/ziwei'/);
  });
  it("layers.server.ts 有 'server-only'", () => {
    const src = readFileSync(new URL('../src/lib/layers.server.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/import 'server-only'/);
  });
});
