import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { BASE_BLOCKS, RULE_REGISTRY, SPEC_VERSION, assembleAll, inferAll } from '../src/index';
import { fitWatchLead } from '../src/watch-lead';

const sentences = (s: string): string[] => s.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [];

let seed = 20260930;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};

const BOOKS = Array.from({ length: 400 }, (_, i) => {
  const r = cast({
    solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  if (!r.ok) return null;
  const a = annual(r.value, 2026);
  if (!a.ok) return null;
  const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `a${i}`, layer: 'natal' });
  return assembleAll(r.value, by, { seed: `a${i}` });
}).filter((x) => x !== null);

const STARS = new Set(BASE_BLOCKS.map((b) => b.star));

/*
 * 2026-10-18 · 後生讀者抽樣 B6：砌句漏底。
 * 「天機：選項太多⋯」似筆記（400 本書 326 本有）；「這個人傾向於⋯」對住讀者講第三人稱。
 */
describe('宮位章：砌句唔漏底', () => {
  it('冇「星名：」標籤句、冇「這個人」', { timeout: 120_000 }, () => {
    const bad = new Set<string>();
    for (const book of BOOKS)
      for (const c of book)
        for (const s of c.segments)
          for (const t of sentences(s.text)) {
            const m = /^(\S{2})：/.exec(t);
            if ((m && STARS.has(m[1]!)) || t.includes('這個人')) bad.add(`${s.slot}：${t}`);
          }
    expect([...bad]).toEqual([]);
  });
});

/*
 * B10：結論已經講限制，「只是／但」就接錯方向。
 */
describe('結論段轉接語跟方向（fitWatchLead）', () => {
  it('結論講長處：照輪換', () => {
    expect(fitWatchLead('你和後輩感情融洽，相處和美。', '要留意的是：該嚴格的時候，你往往開不了口。', '只是')).toBe('只是');
  });
  it('結論講限制、留意句再講代價：而且', () => {
    expect(fitWatchLead('你和後輩之間容易不和。', '要留意的是：你給的選項太多，對方反而難以定下來。', '只是')).toBe('而且');
    expect(fitWatchLead('你結識的朋友來自四方八面，但大多來來去去，常在更換。', '要留意的是：你的人脈廣而輕，沉澱下來的關係未必多。', '但')).toBe('而且');
  });
  it('結論講限制、留意句係做法：不過', () => {
    expect(fitWatchLead('你的疲累來自硬撐，不太承認自己需要停下來。', '要留意的是：你提早承認累了，比學會休息更有用。', '只是')).toBe('不過，');
  });
  it('中性嘅「要留意的是，」照用', () => {
    expect(fitWatchLead('你和後輩之間容易不和。', '要留意的是：x。', '要留意的是，')).toBe('要留意的是，');
  });
});
