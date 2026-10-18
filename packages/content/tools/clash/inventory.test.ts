import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { RULE_REGISTRY, SPEC_VERSION, assembleAll, inferAll } from '../../src/index';
import { BRANCH_TOPICS } from '../../src/branch';
import { PAIR_PLAIN } from '../../src/palace-plain';
import { L3_BLOCKS } from '../../src/l3-data';
import { decadeChapter } from '../../src/daxian';
import { yearChapter } from '../../src/liunian';

const sentences = (s: string): string[] => (s.match(/[^。！？]*[。！？]/g) ?? []).map((x) => x.trim()).filter(Boolean);
const strip = (t: string) => t.replace(/^(不過，|但)/, '');
let seed = 20261018;
const rnd = (n: number) => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n); };

it.skipIf(!process.env.CLASH_INVENTORY)('inventory', { timeout: 900_000 }, () => {
  const combo = new Set<string>();
  for (const t of BRANCH_TOPICS) if (t.topic.stars.length >= 2) for (const r of t.rules) for (const s of sentences(r.text)) combo.add(s);
  for (const p of PAIR_PLAIN) for (const s of [...sentences(p.summary), ...sentences(p.watch), ...sentences(p.life)]) combo.add(s);
  for (const b of L3_BLOCKS) if (b.kind === 'geju') for (const s of sentences(b.body)) combo.add(s);
  type Row = { text: string; chapter: string; slots: Set<string>; n: number };
  const rows = new Map<string, Row>();
  const add = (chapter: string, slot: string, t: string) => {
    const s = strip(t);
    if (s.length < 6) return;
    const k = `${chapter}|${s}`;
    const r = rows.get(k) ?? { text: s, chapter, slots: new Set(), n: 0 };
    r.slots.add(slot); r.n++; rows.set(k, r);
  };
  for (let i = 0; i < 3000; i++) {
    const r = cast({ solar: { y: 1940 + rnd(80), m: 1 + rnd(12), d: 1 + rnd(28) }, time: { h: rnd(24), min: rnd(60) }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
    if (!r.ok) continue;
    const a = annual(r.value, 2026);
    if (!a.ok) continue;
    const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `i${i}`, layer: 'natal' });
    for (const c of assembleAll(r.value, by, { seed: `i${i}` })) for (const s of c.segments) if (!['過場', '留白'].includes(s.slot)) for (const t of sentences(s.text)) add(c.palace!, s.slot, t);
    if (i < 1500) {
      for (const ch of [decadeChapter({ chart: r.value, year: 2026 }), yearChapter({ chart: r.value, year: 2026 })]) {
        if (!ch) continue;
        for (const s of ch.segments) if (!['留白', '明年', '逐月'].includes(s.slot)) for (const t of sentences(s.text)) add(ch.slug, s.slot, t);
      }
    }
  }
  const out = [...rows.values()].map((r) => ({ chapter: r.chapter, text: r.text, slots: [...r.slots], n: r.n, combo: combo.has(r.text) }));
  writeFileSync('tools/clash/inventory.json', JSON.stringify(out, null, 0));
  const byCh: Record<string, number> = {};
  for (const r of out) byCh[r.chapter] = (byCh[r.chapter] ?? 0) + 1;
  console.log('TOTAL', out.length, 'unique texts', new Set(out.map((r) => r.text)).size, JSON.stringify(byCh), 'combo', out.filter((r) => r.combo).length);
});
