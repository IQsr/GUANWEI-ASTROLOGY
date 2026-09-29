import { describe, expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { XINGXI, leanOf, xingxiOf } from '../src/xingxi';
import { CORPUS, normaliseForMatch, withoutCitations } from '../src/lexicon';
import { scanForbidden } from '../src/lint';

/**
 * 六十星系（B5 · 2026-09）。逐批寫（每批十個），寫到邊測到邊。
 * 資料未寫到嘅星系 `xingxiOf()` 回 null —— 兩個新章要等六十個齊先接入命書。
 */

/* 偽隨機（mulberry32，固定種子）：等差取樣同簡單 LCG 都會重複同一批盤，分佈唔均 */
let seed = 20260929;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};
function sample(i: number): BirthInput {
  return {
    solar: { y: 1940 + rnd(70), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  };
}
const CHARTS = Array.from({ length: 4000 }, (_, i) => cast(sample(i)))
  .filter((r) => r.ok)
  .map((r) => (r as { ok: true; value: Parameters<typeof xingxiOf>[0] }).value);

describe('資料', () => {
  it('已寫好嘅星系，編號連續唔重複', () => {
    expect(XINGXI.map((x) => x.n)).toEqual(Array.from({ length: XINGXI.length }, (_, i) => i + 1));
  });

  it('引文喺語料庫搵得返（王亭之原書嘅短句，唔係成段）', () => {
    for (const x of XINGXI) {
      for (const s of x.sources) {
        const p = CORPUS[s.corpus]?.passages[s.passage_id];
        expect(p, `${x.n} → ${s.passage_id}`).toBeTruthy();
        expect(normaliseForMatch(p!.text).includes(normaliseForMatch(s.quote)), `${x.n}：「${s.quote}」`).toBe(true);
      }
    }
  });

  it('過到語氣 lint', () => {
    for (const x of XINGXI) {
      for (const t of [x.core, x.trine, ...Object.values(x.lean)]) {
        expect(scanForbidden(withoutCitations(t), 'body'), `${x.n}：${t.slice(0, 12)}`).toEqual([]);
      }
    }
  });

  it('冇內部規則字眼（本書、規範、這說的是）', () => {
    for (const x of XINGXI) {
      for (const t of [x.core, x.trine, ...Object.values(x.lean)]) expect(t, `${x.n}`).not.toMatch(/本書|規範|這說的是|讀者/);
    }
  });
});

describe('喺真盤上揀星系同偏向', () => {
  const hits = CHARTS.map((c) => ({ c, x: xingxiOf(c) })).filter((h) => h.x);

  it('四千張盤，已寫好嘅星系全部撞到', () => {
    const seen = new Set(hits.map((h) => h.x!.system.n));
    expect([...seen].sort((a, b) => a - b)).toEqual(XINGXI.map((x) => x.n));
  });

  it('揾到嘅星系同命宮主星（或者借嘅對宮主星）對得上', () => {
    for (const { c, x } of hits.slice(0, 200)) {
      const m = c.palaces.find((p) => p.name === '命宮')!;
      const src = x!.borrowed ? c.palaces.find((p) => p.branch === m.borrowsFrom)! : m;
      const majors = src.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort();
      expect(majors).toEqual([...x!.system.stars].sort());
      expect(x!.system.branches).toContain(src.branch);
    }
  });

  /**
   * ⚠ 條軸唔可以永遠擺向一邊 —— 噉樣「偏向」就係一句人人都收到嘅說話（巴納姆）。
   * 每個星系喺樣本入面，兩頭都要出現過（平衡唔計）。
   */
  it('每個星系兩頭都揀得到', () => {
    for (const x of XINGXI) {
      const poles = new Set(hits.filter((h) => h.x!.system.n === x.n).map((h) => leanOf(h.c, x).pole));
      for (const p of x.poles) expect(poles.has(p), `${x.n} ${x.name}：從來冇揀過「${p}」（${[...poles].join('、')}）`).toBe(true);
    }
  });

  it('同一張盤揀兩次，答案一樣', () => {
    for (const { c, x } of hits.slice(0, 50)) expect(leanOf(c, x!.system)).toEqual(leanOf(c, x!.system));
  });
});
