import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { citation } from '../src/citation';
import systems from '../src/cards/free-ming-systems.json';
import initial from '../src/cards/free-ming-reading.json';
import audit from '../src/cards/free-ming-reference-audit.json';
import index from '../../../tools/wang-reference/deep-index.json';

it('核讀紀錄覆蓋六十星系及兩套引用；跨頁每個原段都綁定原索引，疑字說明不冒充引文', () => {
  expect(audit.systems.map((s) => s.n)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  const blocks = new Map(index.blocks.map((b) => [b.id, b]));
  const files = { 'free-ming-systems.json': systems, 'free-ming-reading.json': initial };
  for (const [filename, data] of Object.entries(files)) {
    const hash = createHash('sha256').update(readFileSync(new URL(`../src/cards/${filename}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
    expect(hash).toBe(audit.data_sha256[filename as keyof typeof files]);
    const prefix = filename === 'free-ming-systems.json' ? 'free.systems.v1:' : 'free.reading.v1:';
    for (const [id, source] of Object.entries(data.sources)) {
      const row = audit.sources[`${filename}:${id}` as keyof typeof audit.sources];
      expect(row, id).toBeDefined();
      expect(source.quoteBlocks).toEqual(row.quoteBlocks);
      const pages = source.quoteBlocks.map((k) => {
        const b = blocks.get(k)!;
        expect(b.text_sha256).toBe(row.block_sha256[k as keyof typeof row.block_sha256]);
        return b.pdf_page;
      });
      expect(source.quotePages).toEqual([Math.min(...pages), Math.max(...pages)]);
      const resolved = citation(prefix + id)!;
      expect(resolved.page).toBe(source.quotePages[0]);
      expect(resolved.pageEnd).toBe(source.quotePages[1]! > source.quotePages[0]! ? source.quotePages[1] : undefined);
      expect(resolved.text).toBe(source.excerpt);
      if ('sourceNote' in source) expect(resolved.sourceNote).toBe(source.sourceNote);
    }
  }
});

it('短摘回歸：保留否定、例外、收益前提及轉化的必要條件', () => {
  const source = (id: keyof typeof systems.sources) => systems.sources[id].excerpt;
  expect(source('wtz.deep.p042.b006')).toContain('爱好物质享受');
  expect(source('wtz.deep.p042.b004')).toContain('对宫为贪狼');
  expect(source('wtz.deep.p082.b006')).toContain('若不化忌');
  expect(source('wtz.deep.p082.b007')).toContain('必须巨门本身化禄化权');
  expect(source('wtz.deep.p082.b008')).toContain('亦非破格');
  expect(source('wtz.deep.p206.b008')).toContain('往往损人利已');
  expect(source('wtz.deep.p206.b009')).toContain('并不代表野心');
  expect(source('wtz.deep.p206.b010')).toContain('亦必须贪狼化禄');
  expect(source('wtz.deep.p206.b012')).toContain('或与命宫的[武贪]同度');
  expect(source('wtz.deep.p188.b010')).toContain('必须有吉星祥曜会合');
  expect(source('wtz.deep.p050.b012')).toContain('化禄、化忌');
  expect(source('wtz.deep.p081.b011')).toContain('无吉化，但见煞曜则为破格');
  expect(initial.sources['wtz.deep.p087.b014'].excerpt).not.toMatch(/之间，$/);
  expect(initial.sources['wtz.deep.p215.b013'].excerpt).toContain('两组星曜的平衡');
  const unclear = systems.profiles.find((p) => p.n === 13)!;
  expect(unclear.limit.text).not.toContain('無煞而吉化');
  expect(unclear.limit.conditions.join('')).toContain('原PDF有疑字');
});
