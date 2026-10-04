import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { dialFor } from '@/lib/dial';
import { chartLayers } from '@/lib/layers.server';

/** 章尾金線星盤點出邊一格（2026-10-04） */
const CHART = (() => {
  const r = cast({
    solar: { y: 1990, m: 3, d: 21 },
    time: { h: 14, min: 20 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'female',
  });
  if (!r.ok) throw new Error(r.code);
  return r.value;
})();
const L = chartLayers(CHART, 2026)!;
const branchOf = (name: string) => CHART.palaces.find((p) => p.name === name)!.branch;

describe('章尾星盤', () => {
  it('宮位章點出嗰一宮；總結類嘅章點命宮', () => {
    expect(dialFor(CHART, '夫妻', L)!.branch).toBe(branchOf('夫妻'));
    for (const s of ['序', '性格的骨架', '三方四正', '一生十二步', '給你的話']) {
      expect(dialFor(CHART, s, L)!.branch, s).toBe(branchOf('命宮'));
    }
  });

  it('身宮章點身宮；這十年點大限命宮；這一年點流年命宮', () => {
    expect(dialFor(CHART, '身宮與五行局', L)!.branch).toBe(CHART.palaces.find((p) => p.isShen)!.branch);
    expect(dialFor(CHART, '這十年', L)!.branch).toBe(L.decadal!.ming);
    expect(dialFor(CHART, '這一年', L)!.branch).toBe(L.annual.ming);
  });

  it('說明寫明宮名、地支同主星；空宮講明借對宮', () => {
    const d = dialFor(CHART, '夫妻', L)!;
    expect(d.caption).toMatch(/^夫妻宮在.+ · /);
    const empty = CHART.palaces.find((p) => !p.stars.some((s) => s.kind === 'major'));
    if (empty) expect(dialFor(CHART, empty.name, L)!.caption).toMatch(/借對宮|沒有主星/);
  });
});
