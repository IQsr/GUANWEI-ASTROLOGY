import { describe, expect, it } from 'vitest';
import { LEXICON, LEXICON_EN } from '../src/lexicon-data';
import { PALACE_EN, STAR_EN } from '../src/en/terms';
import { scanEnglish } from '../src/en/lint';

/** 詞條英文（2026-10-05）：三十五條齊、名同詞彙表一致、過英文檢查。 */
describe('詞條英文', () => {
  it('每條詞條都有英文，冇多出嚟嘅', () => {
    expect(Object.keys(LEXICON_EN).sort()).toEqual(LEXICON.map((e) => e.id).sort());
  });

  it('名同詞彙表一致', () => {
    for (const e of LEXICON) {
      const en = LEXICON_EN[e.id]!;
      const slug = e.id.split('.')[1]!;
      if (e.kind === 'star') expect(en.label, e.id).toBe(STAR_EN[slug]!.pinyin);
      if (e.kind === 'palace') expect(en.label, e.id).toBe(PALACE_EN[slug]);
    }
  });

  it('過英文檢查，段數同中文一樣', () => {
    for (const e of LEXICON) {
      const en = LEXICON_EN[e.id]!;
      expect(scanEnglish(`${en.summary}\n${en.full}`), e.id).toEqual([]);
      expect(en.full.split('\n\n').length, e.id).toBe(e.full.split('\n\n').length);
    }
  });
});
