/**
 * 流魁流鉞冲起本命魁鉞（kuiyue.ts · 2026-10-06）—— 深造講義 p.8、9、323、351、362
 */
import { describe, expect, it } from 'vitest';
import { BRANCHES, annual, cast, flowStars, type Branch } from '@guanwei/ziwei';
import { KUIYUE_TEXT, kuiyueRises } from '../src/kuiyue';
import { decadeChapter } from '../src/daxian';
import { yearChapter } from '../src/liunian';
import { renderParagraphs } from '../src/en/render';
import { scanEnglish } from '../src/en/lint';

function charts(n: number) {
  const out = [];
  let seed = 5;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const r = cast({ solar: { y: 1950 + (seed % 55), m: 1 + (seed % 12), d: 1 + (seed % 28) }, time: { h: seed % 24, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: seed % 2 ? 'male' : 'female' });
    if (r.ok) out.push(r.value);
  }
  return out;
}

const opp = (b: Branch) => BRANCHES[(BRANCHES.indexOf(b) + 6) % 12]!;

describe('流魁流鉞冲起本命魁鉞', () => {
  const cs = charts(300);

  it('條件：流魁或流鉞落喺本命魁鉞同宮或對宮，而本命魁鉞喺命宮三方四正', () => {
    for (const c of cs.slice(0, 60)) {
      const kui = c.palaces.find((p) => p.stars.some((s) => s.name === '天魁'))!.branch;
      /* 本命魁鉞自己做流魁鉞：一定同宮 —— 但要喺三方四正先算 */
      const self = { 天魁: kui, 天鉞: kui };
      expect(kuiyueRises(c, kui, self)).toBe(true);
      expect(kuiyueRises(c, kui, { 天魁: opp(kui), 天鉞: opp(kui) })).toBe(true);
    }
  });

  it('大限：唔係人人都有（約一成）', () => {
    let hit = 0;
    for (const c of cs) {
      const A = annual(c, 2026);
      if (!A.ok || !A.value.decadal) continue;
      if (kuiyueRises(c, A.value.decadal.branch, flowStars(A.value.decadal.stem, A.value.decadal.branch))) hit++;
    }
    expect(hit / cs.length).toBeGreaterThan(0.05);
    expect(hit / cs.length).toBeLessThan(0.25);
  });

  it('〈這十年〉有條件先出段，出就喺大限段之後', () => {
    let seen = 0;
    for (const c of cs.slice(0, 120)) {
      const ch = decadeChapter({ chart: c, year: 2026 });
      if (!ch) continue;
      const slots = ch.segments.map((s) => s.slot);
      const i = slots.indexOf('魁鉞');
      if (i < 0) continue;
      seen++;
      expect(slots[i - 1]).toBe('大限');
      expect(ch.segments[i]!.text).toBe(KUIYUE_TEXT.decade);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('〈這一年〉2027 丁未年有人出；2026 丙午年冇人出（流魁鉞同流年命宮跟年份走）', () => {
    const has = (y: number) => cs.slice(0, 120).some((c) => yearChapter({ chart: c, year: y })?.segments.some((s) => s.slot === '魁鉞'));
    expect(has(2027)).toBe(true);
    expect(has(2026)).toBe(false);
  });

  it('英文：兩句都譯得到，過英文檢查', () => {
    for (const t of Object.values(KUIYUE_TEXT)) {
      const en = renderParagraphs([t]);
      expect(en.missing, t).toEqual([]);
      expect(scanEnglish(en.paras[0]!), t).toEqual([]);
    }
  });
});
