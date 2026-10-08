/**
 * 藏經閣有邊幾種語言（2026-10-05 由 lib/lexicon.ts 抽出嚟）。
 *
 * ⚠ 呢個檔唔准 import 任何嘢：middleware 要用，而 lib/lexicon.ts 會拖成個內容包
 *   （詞條、語料庫、翻譯表）入 middleware —— 以前 middleware 因此有 400 kB。
 */
export const LEXICON_LOCALE = 'zh-Hant';
export const LEXICON_LOCALES = ['zh-Hant', 'zh-Hans', 'en'] as const;
export const isLexiconLocale = (l: string) => (LEXICON_LOCALES as readonly string[]).includes(l);
