/**
 * 詞條實例（工單 C3）
 *
 * 三十五條齊：十四主星、十二宮、四化、五行局。
 * `lexiconCoverage()` 仍然留住 —— 加新 kind 嗰陣佢會即刻話你知差幾多。
 */
import stars from './lexicon/stars.json';
import palaces from './lexicon/palaces.json';
import sihua from './lexicon/sihua.json';
import ju from './lexicon/ju.json';
import { buildLexicon, distinctBooks, type LexiconEntry } from './lexicon';

export const LEXICON: LexiconEntry[] = buildLexicon([
  ...(stars as unknown[]),
  ...(palaces as unknown[]),
  ...(sihua as unknown[]),
  ...(ju as unknown[]),
]);

export const LEXICON_TARGET = {
  star: 14,
  palace: 12,
  sihua: 4,
  ju: 5,
} as const;

export function lexiconOf(id: string): LexiconEntry | null {
  return LEXICON.find((e) => e.id === id) ?? null;
}

/** 寫咗幾多、差幾多。呢個數應該公開，唔應該收埋。 */
export function lexiconCoverage() {
  const rows = (Object.keys(LEXICON_TARGET) as (keyof typeof LEXICON_TARGET)[]).map((k) => ({
    kind: k,
    done: LEXICON.filter((e) => e.kind === k).length,
    target: LEXICON_TARGET[k],
  }));
  return {
    rows,
    done: rows.reduce((a, r) => a + r.done, 0),
    target: rows.reduce((a, r) => a + r.target, 0),
  };
}

/**
 * ⚠ 靠單一本書嘅詞條。
 *
 * 「兩個來源」而家兩條都出自《全書》—— 兩篇唔同（諸星問答論、分屬表），
 * 所以係兩個**文本位置**，但係**一個證人**。
 * 一本書錯咗，兩條引文會一齊錯。呢個數要睇得見。
 */
export function singleBookEntries(): LexiconEntry[] {
  return LEXICON.filter((e) => distinctBooks(e).length < 2);
}
