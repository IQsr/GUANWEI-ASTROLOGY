import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { annual, BRANCHES, cast, flowStars, STEMS, tianxingBranch, type Branch } from '../src/index';

/**
 * 流曜同天刑（2026-10-04）。天刑對照文墨天機（獨立證人，見 conformance-wenmo）。
 */
type WenmoChart = {
  file: string;
  yinyang: string;
  birth: { y: number; m: number; d: number; h: number; min: number };
  palaces: Record<string, { stars: [string, string | null][] }>;
};
const CHARTS: WenmoChart[] = JSON.parse(readFileSync(new URL('./fixtures/wenmo-charts.json', import.meta.url), 'utf8'));

describe('流祿存、流羊、流陀', () => {
  it('同一個天干，同本命祿存羊陀一樣位置', () => {
    for (const c of CHARTS) {
      const r = cast({
        solar: { y: c.birth.y, m: c.birth.m, d: c.birth.d },
        time: { h: c.birth.h, min: c.birth.min },
        tz: 'Etc/GMT-8',
        place: { lng: 120, lat: 30, label: 'x' },
        sex: c.yinyang.endsWith('男') ? 'male' : 'female',
      });
      if (!r.ok) throw new Error(c.file);
      const where = (name: string) => r.value.palaces.find((p) => p.stars.some((s) => s.name === name))!.branch;
      const f = flowStars(r.value.ganzhi.year[0]);
      expect(f, c.file).toEqual({ 祿存: where('祿存'), 擎羊: where('擎羊'), 陀羅: where('陀羅') });
    }
  });

  it('羊陀永遠夾住祿存；祿存唔落四墓', () => {
    for (const s of STEMS) {
      const f = flowStars(s);
      const i = BRANCHES.indexOf(f.祿存);
      expect(f.擎羊).toBe(BRANCHES[(i + 1) % 12]);
      expect(f.陀羅).toBe(BRANCHES[(i + 11) % 12]);
      expect(['辰', '戌', '丑', '未']).not.toContain(f.祿存);
    }
  });

  it('annual() 帶住流年同大限兩套；未起運冇大限嗰套', () => {
    const r = cast({ solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
    if (!r.ok) throw new Error('cast');
    const a = annual(r.value, 2026);
    if (!a.ok) throw new Error('annual');
    expect(a.value.liuyao.annual).toEqual(flowStars(a.value.ganzhi[0]));
    expect(a.value.liuyao.decadal).toEqual(flowStars(a.value.decadal!.stem));
    const first = annual(r.value, r.value.lunar.y);
    if (!first.ok) throw new Error('annual');
    if (first.value.decadal === null) expect(first.value.liuyao.decadal).toBeNull();
  });
});

describe('天刑', () => {
  it('二十一張盤同文墨天機一樣', () => {
    let n = 0;
    for (const c of CHARTS) {
      const theirs = Object.entries(c.palaces).find(([, p]) => p.stars.some(([s]) => s === '天刑'))?.[0] as Branch | undefined;
      if (!theirs) continue;
      const r = cast({
        solar: { y: c.birth.y, m: c.birth.m, d: c.birth.d },
        time: { h: c.birth.h, min: c.birth.min },
        tz: 'Etc/GMT-8',
        place: { lng: 120, lat: 30, label: 'x' },
        sex: c.yinyang.endsWith('男') ? 'male' : 'female',
      });
      if (!r.ok) throw new Error(c.file);
      expect(tianxingBranch(r.value), c.file).toBe(theirs);
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(20);
  });
});
