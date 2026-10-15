/**
 * 日文檢查（2026-10-15）。
 *
 * JA-1 冇繁體專用字形：日本有新字體嘅字要用新字體（祿→禄、權→権、數→数⋯）
 * JA-2 冇中文虛詞、代詞：你、這、們、嗎⋯ 出現即係漏譯或者半譯
 * JA-3 每句要有假名：成句漢字通常係原文照搬
 * JA-4 冇〔〕：譯唔到嘅句嘅記號
 */
/* 只列日文有另一個新字體嘅繁體字（開、問、時、個、為、還 喺日文本身係正字，唔列） */
const TRAD = /[祿權數德陷會裡歲處實學經歡變樂氣發點說對禮體廣邊樣關覺讓從與將應當]/;
const ZH_WORDS = /[你這們嗎呢吧沒麼甚]/;
const KANA = /[\u3040-\u30ff]/;

export function scanJapanese(s: string): string[] {
  const out: string[] = [];
  const trad = [...s].filter((c) => TRAD.test(c));
  if (trad.length) out.push(`JA-1 繁體字形：${[...new Set(trad)].join('')}`);
  if (ZH_WORDS.test(s)) out.push('JA-2 中文代詞／虛詞');
  for (const sent of s.split(/(?<=[。！？])/).filter((x) => x.trim())) {
    if (!KANA.test(sent)) out.push(`JA-3 冇假名：${sent}`);
  }
  if (/[〔〕]/.test(s)) out.push('JA-4 有未譯記號');
  return out;
}
