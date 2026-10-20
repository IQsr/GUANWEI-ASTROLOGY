import { expect, it } from 'vitest';
import { citation } from '../src/citation';
import locations from '../src/cards/ming-source-locations.json';
import reviewed from '../src/cards/ming-reviewed.json';
import index from '../../../tools/wang-reference/deep-index.json';

it('命宮短節錄綁定已核來源與定位，不冒充舊 corpus 頁碼', () => {
  expect(locations.pdf_sha256).toBe(reviewed.pdf_sha256);
  expect(locations.pdf_sha256).toBe(index.book.sha256);
  const blocks = new Map(index.blocks.map((b) => [b.id, b]));
  const refs = [...new Map(Object.values(reviewed.cards).flatMap((c) => c.sources).map((s) => [s.id, s])).values()];
  expect(Object.keys(locations.locations).sort()).toEqual(refs.map((s) => s.id).sort());
  for (const source of refs) {
    const block = blocks.get(source.id)!;
    const loc = (locations.locations as Record<string, { page: number; section: string; sha256: string; excerpt: string[] }>)[source.id]!;
    expect(loc).toMatchObject({ page: block.pdf_page, section: block.section_title, sha256: source.sha256 });
    expect(loc.excerpt.length).toBeGreaterThan(0);
    expect(loc.excerpt.every((s) => s.trim().length > 0)).toBe(true);
    expect(loc.excerpt.join('……').length).toBeLessThanOrEqual(150);
    expect(block.text_sha256).toBe(source.sha256);
    expect(citation(source.id)).toMatchObject({ page: loc.page, section: loc.section, pageConvention: 'pdf', text: loc.excerpt.join('……'), excerpt: true });
  }
  expect(citation('wtz.deep.p999.b999')).toBeNull();
});
