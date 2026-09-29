import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { BASE_BLOCKS, PALACE_PLAIN, RULE_REGISTRY, SPEC_VERSION, assembleAll, inferAll, scanPlain } from '../src/index';

/**
 * 十二宮章直白（2026-09-29 · docs/voice.md 第六節）
 *
 * 一、每格（主星 × 宮）都有結論句
 * 二、每一章第一段就係結論：對住「你」講，冇星名
 * 三、成章冇講方法、冇列條件（留白係問句，一樣要過）
 * 四、結論之後唔再重複講一次同一句（開場以前會重講「用做事表達在意」）
 */

let seed = 20260929;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};

const BOOKS = Array.from({ length: 150 }, (_, i) => {
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
  const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, {
    chartId: `p${i}`,
    layer: 'natal',
  });
  return assembleAll(r.value, by, { seed: `p${i}` });
}).filter((x) => x !== null);

describe('十二宮章直白', () => {
  it('168 格都有結論句', () => {
    const have = new Set(PALACE_PLAIN.map((x) => `${x.star}.${x.palace}`));
    expect(BASE_BLOCKS.filter((b) => !have.has(`${b.star}.${b.palace}`)).map((b) => b.id)).toEqual([]);
  });

  it('每一章第一段就係結論', () => {
    for (const book of BOOKS) {
      for (const c of book) {
        const first = c.segments[0]!;
        expect(first.slot, c.palace).toBe('結論');
        expect(scanPlain(first.text, c.palace, { leadsWithConclusion: true }), first.text).toEqual([]);
      }
    }
  });

  it('成章冇講方法、冇列條件', () => {
    for (const book of BOOKS) {
      for (const c of book) {
        for (const s of c.segments) expect(scanPlain(s.text, `${c.palace}/${s.slot}`), s.text).toEqual([]);
      }
    }
  });

  it('結論講過嘅，後面唔再原句重講', () => {
    const cjk = (t: string) => t.replace(/[^㐀-鿿]/g, '');
    for (const book of BOOKS) {
      for (const c of book) {
        const head = cjk(c.segments[0]!.text);
        for (const s of c.segments.slice(1)) {
          if (s.slot === '牽動' || s.slot === '留白') continue;
          const body = cjk(s.text);
          const hit = Array.from({ length: Math.max(0, head.length - 7) }, (_, i) => head.slice(i, i + 8)).find((run) => body.includes(run));
          expect(hit, `${c.palace}/${s.slot}：${s.text}`).toBeUndefined();
        }
      }
    }
  });
});
