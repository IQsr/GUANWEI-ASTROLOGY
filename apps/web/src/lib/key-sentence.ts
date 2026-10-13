/**
 * 重點句加粗（2026-10-13 · 讀者 feedback：「字有少少多，搵唔到重點」）
 *
 * 每章第一段（`結論`；骨架章係 `偏向`）嘅結論句加粗，一段最多一句。
 * 喺顯示嗰陣先揀，唔寫落 DB —— 舊書一樣有。
 *
 * 揀邊句：第一句；第一句係交代資料（「寫這本書時⋯你虛歲⋯」「你的大限由虛歲⋯起」）就揀下一句。
 * 中英文一樣規矩。
 */

const KEY_SLOTS = new Set(['結論', '偏向']);

const FACT = /^(寫這本書|你的大限由|When this book was written|Your ten-year stages|\d{4}, the year this book was written)/;

function splitSentences(text: string): string[] {
  const cjk = /[㐀-鿿]/.test(text);
  const re = cjk ? /[^。！？]*[。！？]|[^。！？]+$/g : /[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g;
  return (text.match(re) ?? []).filter((s) => s.trim());
}

/** 加粗嘅範圍 `[start, end)`（字元位），冇就 null。 */
export function keyRange(slot: string, text: string): [number, number] | null {
  if (!KEY_SLOTS.has(slot)) return null;
  const ss = splitSentences(text);
  if (ss.length === 0) return null;
  let i = 0;
  if (FACT.test(ss[0]!.trim())) i = 1;
  if (i >= ss.length) return null;
  const start = ss.slice(0, i).join('').length;
  /* 英文句尾嘅空格唔加粗 */
  const end = start + ss[i]!.trimEnd().length;
  return [start, end];
}
