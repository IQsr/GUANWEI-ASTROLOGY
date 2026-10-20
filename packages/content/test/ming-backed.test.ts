import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import data from '../src/cards/ming-backed.json';
import review from '../src/cards/ming-backed-review.json';
import index from '../../../tools/wang-reference/deep-index.json';
import { backedCiteId, backedLines } from '../src/ming-backed';
import { CARDS, cardsFor } from '../src/card';
import { isProseReviewed } from '../src/ming-prose';
import { citation } from '../src/citation';
import { writeMing } from '../src/ming-writer';

it('六十星系逐句核讀，原段、節錄及稿件指紋對得上；改稿須重核', () => {
  const text = readFileSync(resolve(__dirname, '../src/cards/ming-backed.json'), 'utf8').replace(/\r\n/g, '\n');
  expect(createHash('sha256').update(text).digest('hex')).toBe(review.data_sha256);
  expect(data.pdf_sha256).toBe(index.book.sha256);
  expect(data.profiles.map((p) => p.system)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  const blocks = new Map(index.blocks.map((b) => [b.id, b]));
  const records = [...data.profiles, ...Object.entries(data.extras).map(([card, p]) => ({ ...p, card }))];
  for (const p of records) {
    const card = CARDS.find((c) => c.id === p.card)!;
    expect(backedLines(card), p.card).toEqual(p.lines);
    expect(backedLines({ ...card, claim: card.claim + '新增判斷' })).toBeNull();
    for (const [i, line] of p.lines.entries()) {
      const source = line.source;
      expect(blocks.get(source.id)).toMatchObject({ pdf_page: source.page, section_title: source.section, text_sha256: source.sha256 });
      for (const c of source.continuations) expect(blocks.get(c.id)?.text_sha256).toBe(c.sha256);
      expect(source.excerpt.length).toBeGreaterThan(0);
      expect(source.excerpt.length).toBeLessThanOrEqual(150);
      expect(citation(backedCiteId(p.card, i))).toMatchObject({ text: source.excerpt, page: source.page, pageConvention: 'pdf', excerpt: true });
    }
  }
  for (const id of Object.keys(data.held)) expect(backedLines(CARDS.find((c) => c.id === id)!)).toBeNull();
});

it('其他出生資料實際走同一寫作層，涵蓋六十星系與借星；每句一個來源而盤面不冒充引文', () => {
  let seed = 20261021;
  const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); };
  const seen = new Map<number, unknown>();
  let borrowed = 0;
  for (let i = 0; i < 10000 && (seen.size < 60 || i < 500); i++) {
    const birth = { solar: { y: 1940 + rnd(70), m: 1 + rnd(12), d: 1 + rnd(28) }, time: { h: rnd(24), min: rnd(60) }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' as const : 'female' as const };
    const casted = cast(birth);
    if (!casted.ok) continue;
    const m = writeMing(casted.value);
    if (!m.system) continue;
    if (m.system.borrowed) borrowed++;
    const body = m.sections.flatMap((s) => s.parts.filter((p) => p.part !== '因為'));
    if (!body.length) {
      // 原來的排除條件仍生效，例如辰戌巨門奇格、刑忌夾天相，不能為覆蓋率補出正文。
      expect(cardsFor(casted.value).filter((h) => isProseReviewed(h.card) && backedLines(h.card))).toHaveLength(0);
      continue;
    }
    seen.set(m.system.n, birth);
    expect(body.length).toBeGreaterThanOrEqual(4);
    for (const p of body) {
      expect(p.statements).toHaveLength(1);
      expect(p.statements![0]!.citations).toHaveLength(1);
      expect(p.statements![0]!.text).toBe(p.zh);
      expect(citation(p.statements![0]!.citations[0]!)).not.toBeNull();
    }
    for (const p of m.sections.flatMap((s) => s.parts.filter((p) => p.part === '因為'))) {
      expect(p.statements!.every((l) => l.kind === 'evidence' && l.citations.length === 0)).toBe(true);
    }
    expect(m.text.zh).not.toMatch(/你的盤偏|你屬富局|欲望偏淡|這十年的際遇能令/);
  }
  expect(seen.size).toBe(60);
  expect(borrowed).toBeGreaterThan(0);
  const dir = resolve(__dirname, '../../../tmp');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'sentence-backed-coverage.json'), JSON.stringify(Object.fromEntries(seen), null, 2));
});
