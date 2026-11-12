import { expect, it } from 'vitest';
import base from '../src/cards/ming-backed.json';
import data from '../src/cards/ming-translations.json';
import review from '../src/cards/ming-translations-review.json';
import { mingTranslation } from '../src/ming-translations';
import { scanJapanese } from '../src/ja/lint';

it('254 句英日譯文與已核原句、來源一一對應', () => {
  const entries = data.entries as Record<string, { zh: string; en: string; ja: string }>;
  const ids: string[] = [];
  for (const p of [...base.profiles, ...Object.entries(base.extras).map(([card, x]) => ({ card, ...x }))]) {
    for (const [i, line] of p.lines.entries()) {
      const id = `ming.backed:${p.card}:${i}`;
      ids.push(id);
      expect(entries[id]!.zh).toBe(line.zh);
      for (const locale of ['en', 'ja'] as const) {
        expect(mingTranslation(id, line.zh, locale)).toBe(entries[id]![locale]);
        expect(mingTranslation(id, line.zh + '未核新增', locale)).toBeNull();
        expect(mingTranslation('unreviewed', line.zh, locale)).toBeNull();
        expect(entries[id]![locale].length).toBeGreaterThan(30);
      }
      expect(entries[id]!.en, id).not.toMatch(/[一-鿿〔〕]/);
      expect(scanJapanese(entries[id]!.ja), id).toEqual([]);
    }
  }
  expect(ids).toHaveLength(254);
  expect(Object.keys(entries).sort()).toEqual(ids.sort());
});
