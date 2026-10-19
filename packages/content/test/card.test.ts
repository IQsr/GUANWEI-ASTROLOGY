import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { annual, cast, type Chart } from '@guanwei/ziwei';
import { CARDS, cardsFor, parseCards, type Card } from '../src/card';
import { FORBIDDEN_TERMS } from '../src/frame';
import { scanPlain } from '../src/plain';
import { XINGXI, xingxiOf } from '../src/xingxi';

/*
 * 2026-10-19 新架構試點（命宮）：條件卡。
 *
 * 平時驗 src/cards/ming.json（合併後）。寫卡嗰陣驗單一個草稿檔：
 *   CARD_DRAFT=../../tools/cards/ming/11.json npx vitest run test/card.test.ts
 */
const DRAFT = process.env.CARD_DRAFT;
const POOL: Card[] = DRAFT ? parseCards(JSON.parse(readFileSync(resolve(DRAFT), 'utf8'))) : CARDS;

const REF = resolve(__dirname, '../../../tools/wang-reference');
const deep = JSON.parse(readFileSync(resolve(REF, 'deep-index.json'), 'utf8')) as { blocks: { id: string; text_sha256: string }[] };
const initial = JSON.parse(readFileSync(resolve(REF, 'initial-index.json'), 'utf8')) as { paragraph_index: { id: string }[] };
const SHA = new Map(deep.blocks.map((b) => [b.id, b.text_sha256]));
const INITIAL = new Set(initial.paragraph_index.map((p) => p.id));

describe('條件卡：出處同格式', () => {
  it('每個出處喺索引搵得到，深造段落指紋對得上', () => {
    const bad: string[] = [];
    for (const c of POOL)
      for (const s of c.sources) {
        if (s.id.startsWith('wtz.initial.')) {
          if (!INITIAL.has(s.id)) bad.push(`${c.id}：${s.id} 唔喺初階索引`);
        } else if (!SHA.has(s.id)) bad.push(`${c.id}：${s.id} 唔喺深造索引`);
        else if (s.sha256 !== SHA.get(s.id)) bad.push(`${c.id}：${s.id} 指紋唔啱（應該係 ${SHA.get(s.id)}）`);
      }
    expect(bad).toEqual([]);
  });
  it('偏向寫嘅係嗰個星系條軸嘅一頭，或者「平衡」「無偏」', () => {
    const ok = (c: (typeof POOL)[number], p: string) => p === '平衡' || p === '無偏' || XINGXI.find((s) => s.n === c.system)!.poles.includes(p);
    const bad = POOL.filter((c) => c.pole && !(Array.isArray(c.pole) ? c.pole : [c.pole]).every((p) => ok(c, p))).map((c) => `${c.id}：${c.pole}`);
    expect(bad).toEqual([]);
  });
  it('id 唔重複', () => {
    const ids = POOL.map((c) => c.id);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
  });
  it('讀者文字：唔講術語、唔講方法、唔列條件、唔講病災', () => {
    const SICK = /病|手術|開刀|災|死|夭|血光|僧道|刑傷|官非|牢/;
    const bad: string[] = [];
    for (const c of POOL) {
      const terms = FORBIDDEN_TERMS.filter((t) => c.claim.includes(t));
      if (terms.length) bad.push(`${c.id}：術語 ${terms.join('、')}`);
      if (SICK.test(c.claim)) bad.push(`${c.id}：病災字眼「${SICK.exec(c.claim)![0]}」`);
      for (const f of scanPlain(c.claim, c.id, { leadsWithConclusion: c.layer === 'natal' && c.kind === 'claim' })) bad.push(`${c.id}：${f.message}`);
      if (c.status !== 'needs_atom' && !c.en) bad.push(`${c.id}：冇英文`);
    }
    expect(bad).toEqual([]);
  });
});

let seed = 20261019;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};

/** 每個有卡嘅星系抽盤（預設 100 張；CARD_SAMPLE 可以加大，例如 300 全面掃） */
const SAMPLE = Number(process.env.CARD_SAMPLE ?? 100);
function chartsBySystem(systems: Set<number>): Map<number, Chart[]> {
  const out = new Map<number, Chart[]>([...systems].map((n) => [n, []]));
  for (let i = 0; i < 2000 * SAMPLE && [...out.values()].some((v) => v.length < SAMPLE); i++) {
    const r = cast({
      solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
      time: { h: rnd(24), min: rnd(60) },
      tz: 'Asia/Hong_Kong',
      place: { lng: 114.17, lat: 22.32, label: '香港' },
      sex: i % 2 ? 'male' : 'female',
    });
    if (!r.ok) continue;
    const list = out.get(xingxiOf(r.value)?.system.n ?? 0);
    if (list && list.length < SAMPLE) list.push(r.value);
  }
  return out;
}

describe('條件卡：一個話題一把聲', () => {
  it('同一張盤、同一層、同一個話題，最多一張結論卡；每張卡最少中一次', { timeout: 600_000 }, () => {
    const seen: Record<string, number> = {};
    const bad: string[] = [];
    const bySystem = chartsBySystem(new Set(POOL.map((c) => c.system)));
    for (const [n, charts] of bySystem) {
      const pool = POOL.filter((c) => c.system === n);
      for (const [i, chart] of charts.entries())
        for (let year = 2000; year < 2100; year += 1) {
          const a = annual(chart, year);
          if (!a.ok) continue;
          for (const layer of ['natal', 'decade', 'annual'] as Card['layer'][]) {
            if (layer === 'natal' && year !== 2000) continue;
            const hits = cardsFor(chart, a.value, layer, pool);
            for (const h of hits) seen[h.card.id] = (seen[h.card.id] ?? 0) + 1;
            const claims = hits.filter((h) => h.card.kind === 'claim');
            for (const t of new Set(claims.map((h) => h.card.topic))) {
              const same = claims.filter((h) => h.card.topic === t);
              if (same.length > 1) bad.push(`星系${n} 盤${i} ${year} ${layer}「${t}」：${same.map((h) => h.card.id).join(' + ')}`);
            }
          }
        }
    }
    if (process.env.CARD_STATS) writeFileSync(resolve(process.env.CARD_STATS), JSON.stringify({ seen, bad }, null, 1));
    expect([...new Set(bad.map((b) => b.replace(/ 盤\d+ \d+/, '')))]).toEqual([]);
    const never = POOL.filter((c) => c.status !== 'needs_atom' && c.status !== 'hold' && !c.rare && !seen[c.id]).map((c) => c.id);
    expect(never, '抽樣盤一次都唔中：條件寫錯，或者真係罕見（標 rare: true）').toEqual([]);
  });
});
