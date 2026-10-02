import { describe, expect, it } from 'vitest';
import { cast, sihuaOfStem, STEMS } from '@guanwei/ziwei';
import { DAXIAN_HUA, DAXIAN_PIVOTS, STEPS_UNTIL_AGE, decadeChapter, lifeStepsChapter, pivotSteps } from '../src/daxian';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';
import { withoutCitations } from '../src/lexicon';

/** 大限兩章（2026-09-30）：出處喺 daxian.ts 開頭 */

let seed = 20260930;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};
const CHARTS = Array.from({ length: 400 }, (_, i) =>
  cast({
    solar: { y: 1935 + rnd(90), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  }),
)
  .filter((r) => r.ok)
  .map((r) => (r as { ok: true; value: Parameters<typeof decadeChapter>[0]['chart'] }).value);

describe('大限四化：十干每一化都有講法', () => {
  it('中州派四化表嘅四十個位，逐個有一句', () => {
    const miss: string[] = [];
    for (const s of STEMS) {
      const t = sihuaOfStem(s)!;
      for (const h of ['祿', '權', '科', '忌'] as const) {
        if (!DAXIAN_HUA.some((e) => e.star === t[h] && e.hua === h)) miss.push(`${s}${t[h]}化${h}`);
      }
    }
    expect(miss).toEqual([]);
  });
});

describe('兩章', () => {
  it('四百張盤都砌得出，段段過 lint、冇講方法冇列條件', () => {
    for (const c of CHARTS) {
      for (const ch of [lifeStepsChapter({ chart: c, year: 2026 }), decadeChapter({ chart: c, year: 2026 })]) {
        expect(ch, c.mingGong).not.toBeNull();
        for (const s of ch!.segments) {
          expect(scanForbidden(withoutCitations(s.text), 'body'), `${ch!.slug}/${s.slot}：${s.text}`).toEqual([]);
          expect(scanPlain(s.text, s.slot), s.text).toEqual([]);
        }
        expect(scanPlain(ch!.segments[0]!.text, '結論', { leadsWithConclusion: true }), ch!.segments[0]!.text).toEqual([]);
      }
    }
  });

  it('列到九十歲左右起步嗰幾步，之後一句帶過；標住寫書嗰陣行到邊步', () => {
    const c = CHARTS[0]!;
    const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
    const shown = c.decadals.filter((d) => d.fromAge < STEPS_UNTIL_AGE).length;
    const rows = ch.segments.filter((s) => s.slot === '步');
    expect(rows).toHaveLength(shown + (shown < 12 ? 1 : 0));
    expect(ch.segments.map((s) => s.text).join('')).not.toMatch(/一百/);
    expect(ch.segments.filter((s) => s.text.includes('寫這本書時，你在這一步')).length).toBeLessThanOrEqual(1);
  });

  it('這十年：大限四化四句都講到，而且講明落喺呢十年邊宮', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const s = decadeChapter({ chart: c, year: 2026 })!.segments.find((x) => x.slot === '四化')!;
      expect(s.text.match(/化[祿權科忌]（在這十年的/g)?.length, s.text).toBe(4);
    }
  });

  it('未起運（剛出世）都有章，講第一個大限幾時開始', () => {
    const r = cast({ solar: { y: 2025, m: 12, d: 1 }, time: { h: 10, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
    if (!r.ok) throw new Error('排唔到');
    const ch = decadeChapter({ chart: r.value, year: 2026 })!;
    expect(ch.segments[0]!.text).toMatch(/第一個大限從虛歲.+歲開始/);
  });

  it('同一張盤、同一年，兩次一樣；唔同年份講唔同嘅十年', () => {
    const c = CHARTS[1]!;
    expect(decadeChapter({ chart: c, year: 2026 })).toEqual(decadeChapter({ chart: c, year: 2026 }));
    expect(decadeChapter({ chart: c, year: 2026 })!.segments[0]!.text).not.toBe(decadeChapter({ chart: c, year: 2046 })!.segments[0]!.text);
  });

  it('冇阿拉伯數字（書入面一律中文數字）', () => {
    for (const c of CHARTS.slice(0, 50)) {
      for (const ch of [lifeStepsChapter({ chart: c, year: 2026 })!, decadeChapter({ chart: c, year: 2026 })!]) {
        for (const s of ch.segments) expect(s.text).not.toMatch(/\d/);
      }
    }
  });
});

describe('樞紐大限（下篇宮垣論・命宮，p.336–366）', () => {
  it('大限樞紐四十八條（流年另計），引文喺原文、星名認得（載入嗰陣已經驗）', () => {
    expect(DAXIAN_PIVOTS.filter((r) => r.scope !== 'year').length).toBe(48);
  });

  it('大部分盤有樞紐；書冇講嗰組命宮星就唔標', () => {
    const hit = CHARTS.filter((c) => pivotSteps(c).steps.length > 0).length;
    expect(hit / CHARTS.length).toBeGreaterThan(0.6);
    expect(hit).toBeLessThan(CHARTS.length);
  });

  it('標出嚟嘅步，大限宮真係坐住規則講嘅星', () => {
    for (const c of CHARTS.slice(0, 200)) {
      const { steps, source } = pivotSteps(c);
      if (!steps.length) continue;
      const rule = DAXIAN_PIVOTS.find((r) => r.source.passage_id === source)!;
      for (const n of steps) {
        const d = c.decadals.find((x) => x.index === n)!;
        const p = c.palaces.find((x) => x.branch === d.branch)!;
        const names = p.stars.map((s) => s.name);
        const ok = rule.cond === 'hua' ? p.stars.some((s) => s.sihua) : rule.pivots.some((g) => g.every((s) => names.includes(s)));
        expect(ok, `${rule.id} 第${n}步 ${names.join('')}`).toBe(true);
      }
    }
  });

  it('紫府、紫相：順行逆行只用其中一套', () => {
    for (const c of CHARTS) {
      const { source } = pivotSteps(c);
      if (!source?.includes('紫府') && !source?.includes('紫相')) continue;
      const b0 = c.palaces.findIndex((p) => p.branch === c.decadals[0]!.branch);
      const b1 = c.palaces.findIndex((p) => p.branch === c.decadals[1]!.branch);
      const forward = (b1 - b0 + 12) % 12 === 1;
      expect(source.endsWith(forward ? '.順' : '.逆'), source).toBe(true);
    }
  });

  it('一生十二步：結論講齊關鍵大限，逐步標記數目對得上', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
      /* 只計列出嚟嗰幾步（九十歲左右之後唔細列） */
      const steps = pivotSteps(c).steps.filter((n) => c.decadals.find((d) => d.index === n)!.fromAge < STEPS_UNTIL_AGE);
      expect(ch.segments.filter((s) => s.text.includes('關鍵大限。')).length).toBe(steps.length);
      if (steps.length) expect(ch.segments[0]!.text).toContain('關鍵大限');
    }
  });
});
