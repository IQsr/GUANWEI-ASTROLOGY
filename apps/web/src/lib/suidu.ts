import { BRANCHES, type Chart } from '@guanwei/ziwei/contract';

/**
 * 隨讀：命盤跟住正文行（工單 F2 · 視覺系統 §8）
 *
 * AC：「右側細命盤**跟捲動**高亮對應宮位」。
 *
 * ── ⚠ 「對應宮位」唔係成章一個值 ──
 *
 * 一章讀一個宮，所以如果高亮由頭到尾都係同一格，「跟捲動」呢三個字
 * 就冇意思 —— 個盤淨係做咗一個標籤。
 *
 * 真正對應嘅係**你而家讀緊嗰一格**（內容系統 §6 插槽表）：
 *
 *   開場 · 結構 · 擾動   講緊呢一宮本身      → 亮本宮
 *   牽動               講緊三方四正        → 本宮 ＋ 三合對宮一齊亮
 *   章首 · 過場 · 留白   冇講緊任何一格盤面   → 乜都唔亮
 *
 * 最後嗰行係最容易做錯嘅：留白句係「交返畀讀者」嗰一句（§5 三分結構），
 * 佢唔係一個命理主張。喺嗰一刻亮住一格盤，就係喺一句
 * 「呢一點留返畀你自己驗證」下面繼續指住個盤 —— 講埋唔應該講嘅嘢。
 */

export type Focus = 'palace' | 'sanfang' | 'none' | 'keep';

/** 插槽 → 亮乜。唔喺表入面嘅一律當 `none`（寧願唔亮，唔好亂亮）。 */
export const SLOT_FOCUS: Record<string, Focus> = {
  開場: 'palace',
  結構: 'palace',
  擾動: 'palace',
  正文: 'palace',
  牽動: 'sanfang',
  章首: 'none',
  /*
   * ⚠ 過場句唔熄個盤。
   *
   * 過場係一道橋（內容 §7：「≤25 字，唔帶新資訊」）—— 佢唔換題目。
   * 當佢做 `none` 嘅話，讀者由「結構」捲去「牽動」嗰段之間，
   * 個盤會熄一熄再著返 —— 一版書入面有樣嘢喺度閃。
   * 視覺 §2：「靜係時間 —— 一個視窗入面同時郁緊嘅嘢唔可以多過一樣。」
   */
  過場: 'keep',
  留白: 'none',
  生辰: 'none',
  盤面: 'none',
  體系: 'none',
  五行局: 'none',
  身宮: 'none',
};

export function focusOf(slot: string): Focus {
  return SLOT_FOCUS[slot] ?? 'none';
}

/**
 * 宮名 → 地支索引（0–11），畀 `<Chart selected>` 用。
 *
 * ⚠ 唔可以靠章序推。十二章嘅次序係目錄次序（命宮行先），
 * 而地支索引係盤面次序 —— 兩者差幾多格，係睇你幾時出世。
 */
export function branchIndexOf(chart: Chart, palace: string): number | null {
  const found = chart.palaces.find((p) => p.name === palace);
  if (!found) return null;
  const i = BRANCHES.indexOf(found.branch);
  return i === -1 ? null : i;
}

/**
 * 讀到第 n 段嗰陣，個盤應該係點。
 *
 * 回 `selected` 同 `relations` 兩個值，啱啱好就係 `<Chart>` 要嘅嘢。
 */
export function chartStateAt(
  chart: Chart,
  palace: string,
  slot: string | null,
): { selected: number | null; relations: boolean } {
  const focus = slot === null ? 'none' : focusOf(slot);
  /* `keep` 到咗呢度仲係 `keep`，即係前面根本冇嘢好保 —— 當唔亮。 */
  if (focus === 'none' || focus === 'keep') return { selected: null, relations: false };
  const index = branchIndexOf(chart, palace);
  return { selected: index, relations: focus === 'sanfang' };
}

/**
 * 捲到一段 `slot` 嗰陣，實際應該當佢係邊一格。
 *
 * ⚠ `keep` 嘅段落唔改狀態，保住上一段 —— 見 `SLOT_FOCUS.過場`。
 */
export function resolveSlot(slot: string | null, previous: string | null): string | null {
  if (slot === null) return previous;
  return focusOf(slot) === 'keep' ? previous : slot;
}

/**
 * 由 `body` 同 `slots` 砌返段落。
 *
 * ⚠ 兩邊長度對唔上就**唔猜**：回一個成章一段、slot 係 null 嘅結果。
 * 猜嘅話個盤會喺錯嘅段落亮錯嘅格，而讀者唔會知佢睇緊嘅係錯嘅 ——
 * 一個亮錯格嘅盤，比一個唔亮嘅盤差。
 */
export function paragraphs(
  body: string,
  slots: readonly string[],
): { slot: string | null; text: string }[] {
  const parts = body.split('\n\n').filter((t) => t.trim() !== '');
  if (slots.length !== parts.length) return parts.map((text) => ({ slot: null, text }));
  return parts.map((text, i) => ({ slot: slots[i]!, text }));
}

/** 一章開頭嗰格嘅名（資料鍵）：未跟到之前，盤停喺呢格。 */
export const OPENING_SLOT = '開場';

/** 命宮（章嘅 slug）：目次嗰陣左頁個盤亮呢一宮。 */
export const LIFE_PALACE = '命宮';

/**
 * 分節：邊幾段前面要一個分節記號（2026-09，取代過場句）
 *
 * 一章讀落有三節：講呢一宮本身（開場 · 結構）→ 牽動三方四正（牽動 · 擾動）
 * → 交返畀讀者（留白）。以前節與節之間靠一句過場句接，而家靠排版：
 * 喺「牽動」同「留白」嗰節開頭留一個安靜嘅分節記號。
 *
 * ⚠ 記號擺喺**一節嘅開頭**，唔係每段前面 —— 留白有兩段（收束句 ＋ 章尾）只標第一段。
 * ⚠ 舊書（R-008）仲有過場段：過場緊接住一節嘅話，記號擺喺過場前面，
 *   唔好夾咗喺橋同橋對面之間。
 * ⚠ 第一段前面唔標 —— 一章開頭本身就係分節。
 */
const SECTION_START = new Set(['牽動', '留白']);

export function sectionBreaks(slots: readonly (string | null)[]): boolean[] {
  return slots.map((slot, i) => {
    if (i === 0 || slot === null) return false;
    const prev = slots[i - 1];
    if (slot === '過場') return SECTION_START.has(slots[i + 1] ?? '');
    return SECTION_START.has(slot) && prev !== slot && prev !== '過場';
  });
}

