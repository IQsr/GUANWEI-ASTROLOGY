import { BRIDGE_SLOT } from '@/lib/suidu';

/**
 * 舊書分段：讀嗰陣先分，DB 一個 byte 都唔郁（2026-09）
 *
 * 2026-09 之前寫落 DB 嘅宮位章冇分段：body 係成章段落 `join('')`，slots 係空。
 * R-008 話一本書排出嚟之後一個字都唔變 —— 所以唔回填 DB，喺讀嗰陣先分。
 *
 * 做法：用本書張盤同個 token 重砌返嗰章嘅段落，再逐段對返存咗嘅字。
 * **一個字都要對得上**先用；對唔上（例如內容之後改過版）就回 null，
 * 嗰章照舊一大段 —— 寧願字牆，唔好喺錯嘅位斷句。
 *
 * ⚠ 舊書入面有過場句（新書已經唔出，見 packages/content assemble.ts）。
 * 重砌出嚟嘅段冇佢哋，所以對唔上嗰陣試下係咪句庫入面嘅過場句 ——
 * 係就當佢自己一段（格名「過場」），再繼續對。
 */
export function resplit(
  body: string,
  segments: readonly { slot: string; text: string }[],
  bridges: Iterable<string>,
): { text: string; slots: string[] } | null {
  const bank = [...bridges].filter((b) => b.length > 0);
  const texts: string[] = [];
  const slots: string[] = [];
  let at = 0;

  for (const seg of segments) {
    if (seg.text.length === 0) continue;
    if (!body.startsWith(seg.text, at)) {
      const bridge = bank.find((b) => body.startsWith(b, at) && body.startsWith(seg.text, at + b.length));
      if (!bridge) return null;
      texts.push(bridge);
      slots.push(BRIDGE_SLOT);
      at += bridge.length;
    }
    texts.push(seg.text);
    slots.push(seg.slot);
    at += seg.text.length;
  }

  /* 尾段都要食晒 —— 剩低一截字，就係有段對唔上 */
  if (at !== body.length || texts.length === 0) return null;
  return { text: texts.join('\n\n'), slots };
}

/** 呢章係咪 2026-09 之前嗰種冇分段嘅舊章。 */
export function needsResplit(ch: { text: string | null; slots: readonly string[] }): boolean {
  return ch.text !== null && ch.slots.length === 0 && !ch.text.includes('\n\n');
}
