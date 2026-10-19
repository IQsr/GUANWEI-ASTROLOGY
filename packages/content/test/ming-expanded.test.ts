import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cast, annual, SCHOOL_PROFILE, type Chart } from '@guanwei/ziwei';
import { CARDS, cardsFor, type Card } from '../src/card';
import { writeMing, mingFlow } from '../src/ming-writer';
import { PROSE_PROFILES, MING_REVIEWED, cardReviewKey, isProseReviewed } from '../src/ming-prose';
import review from '../src/cards/ming-reviewed.json';
import { assembleAll, inferAll, mingChapterOf, RULE_REGISTRY, SPEC_VERSION } from '../src/index';
import { xingxiOf } from '../src/xingxi';
import { scanPlain } from '../src/plain';

let seed = 20261020;
const rnd = (n: number) => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n); };
const charts: Chart[] = [];
const systems = new Map<number, Chart>();
for (let i = 0; i < 20000 && (charts.length < 1000 || systems.size < 60); i++) {
  const r = cast({ solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) }, time: { h: rnd(24), min: rnd(60) }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
  if (!r.ok) continue;
  const chart = r.value;
  if (charts.length < 1000) charts.push(chart);
  const x = xingxiOf(chart);
  if (x && !systems.has(x.system.n) && writeMing(chart).sections.some((s) => s.topic === '本質')) systems.set(x.system.n, chart);
}

describe('展開稿：核讀範圍與來源', () => {
  it('六十星系都有獨立本質稿；核讀卡的輸入與原段指紋一致', () => {
    expect(PROSE_PROFILES.map((p) => p.system)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(new Set(PROSE_PROFILES.map((p) => p.explanation.zh)).size).toBe(60);
    const index = JSON.parse(readFileSync(resolve(__dirname, '../../../tools/wang-reference/deep-index.json'), 'utf8')) as { blocks: { id: string; text_sha256: string }[] };
    const sha = new Map(index.blocks.map((b) => [b.id, b.text_sha256]));
    expect(review.pdf_sha256).toBe('513e3d068040efe3684eb3c0e44cf6e447787670bbf5d618f022da2d6c55231b');
    expect(SCHOOL_PROFILE.ref).toBe(review.school_profile_ref);
    for (const [path, fingerprint] of Object.entries(review.inputs)) {
      const source = readFileSync(resolve(__dirname, '../../..', path), 'utf8').replace(/\r\n/g, '\n');
      expect(createHash('sha256').update(source).digest('hex'), `${path} 變更須重核，不能只刷新指紋`).toBe(fingerprint);
    }
    for (const [id, checked] of Object.entries(MING_REVIEWED)) {
      const card = CARDS.find((c) => c.id === id)!;
      expect(cardReviewKey(card), id).toBe(checked.key);
      expect(card.sources, id).toEqual(checked.sources);
      for (const source of checked.sources) expect(sha.get(source.id), source.id).toBe(source.sha256);
    }
  });

  it('改結論、條件、界線、英文或來源後失效；hold／needs_atom 不放行', () => {
    const core = CARDS.find((c) => c.system === 1 && c.topic === '本質' && c.kind === 'claim')!;
    expect(isProseReviewed(core)).toBe(true);
    const altered: Card[] = [
      { ...core, claim: core.claim + '新增斷語。' }, { ...core, en: core.en + ' Added.' },
      { ...core, when: { empty: { name: '命宮' } } }, { ...core, none: { star: '紫微', hua: '忌' } },
      { ...core, limit: '新界線' }, { ...core, sources: [{ ...core.sources[0]!, sha256: '0'.repeat(64) }] },
      { ...core, status: 'hold' }, { ...core, status: 'needs_atom' },
    ];
    for (const card of altered) expect(isProseReviewed(card)).toBe(false);
    expect(isProseReviewed({ ...core, id: 'card.ming.unknown.core', status: 'reviewed' })).toBe(false);
  });
});

describe('展開稿：其他命盤同樣走實際寫作層', () => {
  it('涵蓋六十星系，不靠三張樣本日期；正文先展開，依據最後列', () => {
    expect(systems.size).toBe(60);
    for (const [n, chart] of systems) {
      const m = writeMing(chart);
      expect(m.style).toBe('expanded');
      const s = m.sections.find((s) => s.topic === '本質')!;
      expect(s.heading).toEqual(PROSE_PROFILES.find((p) => p.system === n)!.title);
      expect(s.parts.some((p) => p.part === '展開')).toBe(true);
      expect(s.parts.some((p) => p.part === '情境')).toBe(true);
      expect(s.parts.some((p) => p.part === '做法')).toBe(true);
      expect(s.text.zh).not.toContain('盤面依據');
      expect(m.text.zh.indexOf('盤面依據')).toBeGreaterThan(m.text.zh.indexOf(s.text.zh));
      expect(m.text.zh).not.toContain('來自命宮這組星本身');
      expect(m.text.zh).not.toContain('因為你的命宮');
      expect(scanPlain(s.conclusion.zh, `${n}`, { leadsWithConclusion: true })).toEqual([]);
    }
  });

  it('一千張盤：命中、核讀與正文一一對應，中英齊，例子／建議沒有冒充原書判斷', () => {
    expect(charts).toHaveLength(1000);
    let wrote = 0;
    for (const chart of charts) {
      const m = writeMing(chart);
      if (m.sections.length) wrote++;
      const matched = new Map(cardsFor(chart).map((h) => [h.card.id, h.card]));
      for (const s of m.sections) {
        for (const id of s.source_ids) { expect(matched.has(id), id).toBe(true); expect(isProseReviewed(matched.get(id)!)).toBe(true); }
        for (const p of s.parts) {
          expect(p.zh.trim()).not.toBe(''); expect(p.en.trim()).not.toBe('');
          for (const line of p.statements ?? []) {
            if (line.kind === 'editorial-example' || line.kind === 'editorial-advice') expect(line.citations).toEqual([]);
            if (line.kind === 'interpretation') expect(line.citations.length).toBeGreaterThan(0);
          }
        }
      }
      expect(m.text.zh).not.toMatch(/病|手術|開刀|災|死|夭|血光|僧道|刑傷|官非|牢/);
      expect(m.text.zh).not.toMatch(/card\.|\{decades\}|喺|嘅|咗|唔/);
      expect(m.text.en).not.toMatch(/[\u3400-\u9fff]/);
      const editorial = m.sections.flatMap((s) => s.parts.flatMap((p) => (p.statements ?? []).filter((l) => l.kind === 'editorial-example' || l.kind === 'editorial-advice').map((l) => l.text)));
      expect(new Set(editorial).size).toBe(editorial.length);
    }
    expect(wrote).toBeGreaterThan(900);
  });

  it('未核卡不加段、不補字；全無可用卡時不退回舊命宮章', () => {
    const chart = charts[0]!;
    const a = annual(chart, 2026);
    if (!a.ok) throw Error('no annual chart');
    const by = inferAll(RULE_REGISTRY, { chart, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: 'empty-review', layer: 'natal' });
    const old = assembleAll(chart, by, { seed: 'empty-review' }).find((c) => c.palace === '命宮')!;
    const empty = writeMing(chart, { pool: [] });
    expect(empty.text).toEqual({ zh: '', en: '' });
    const adapted = mingChapterOf(old, empty);
    expect(adapted.text).toBe(''); expect(adapted.segments).toEqual([]);
  });

  it('已知天刑富局及舊欲望淡點票不進正文，未核運限保持 null', () => {
    const r = cast({ solar: { y: 1984, m: 11, d: 2 }, time: { h: 21, min: 15 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
    if (!r.ok) throw Error('cast failed');
    const m = writeMing(r.value);
    expect(m.text.zh).not.toMatch(/你屬富局|欲望偏淡|不愛爭|這十年的際遇能令/);
    expect(m.omitted?.some((o) => o.card === 'card.ming.tanlang-ziwu.zi-fu')).toBe(true);
    expect(mingFlow(r.value, 2026)).toEqual({ decade: null, annual: null });
    const conduct = m.sections.find((s) => s.topic === '處事')!;
    expect(conduct.mode).toBe('caution');
    expect(conduct.conclusion.kind).toBe('caveat');
    expect(conduct.parts[0]!.part).toBe('留意');
  });

  it('cards 開關預設用展開稿；依據最後、逐句種類仍保留，其他十一宮不變', () => {
    const chart = charts[0]!;
    const a = annual(chart, 2026);
    if (!a.ok) throw Error('no annual chart');
    const by = inferAll(RULE_REGISTRY, { chart, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: 'expanded', layer: 'natal' });
    const legacy = assembleAll(chart, by, { seed: 'expanded' });
    const cards = assembleAll(chart, by, { seed: 'expanded', mingWriter: 'cards' });
    expect(cards.filter((c) => c.palace !== '命宮')).toEqual(legacy.filter((c) => c.palace !== '命宮'));
    const ming = cards.find((c) => c.palace === '命宮')!;
    expect(ming.text).toBe(ming.segments.map((s) => s.text).join('\n\n'));
    expect(ming.segments.some((s) => s.slot === '展開')).toBe(true);
    expect(ming.segments.some((s) => s.statements?.some((l) => l.kind === 'editorial-example'))).toBe(true);
    const firstEvidence = ming.segments.findIndex((s) => s.slot === '因為');
    if (firstEvidence >= 0) expect(ming.segments.slice(firstEvidence).every((s) => s.slot === '因為')).toBe(true);
    expect(writeMing(chart)).toEqual(writeMing(chart));
    expect(JSON.parse(JSON.stringify(ming)).segments).toEqual(ming.segments);
  });
});
