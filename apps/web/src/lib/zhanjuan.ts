/**
 * 展卷（工單 E6 · 視覺系統 §9）
 *
 * 「書真正打開，**界欄逐條畫出成十二宮**，星以點落位，然後就係命書正文。」
 *
 * ── ⚠ 一個規範同規範之間嘅衝突 ──
 *
 * 視覺 §7 第四條：「錯落有上限 —— stagger 60–90ms，**最多五件**。」
 * 視覺 §9：「界欄**逐條**畫出成十二宮。」
 *
 * 一個 4×4 盤面點都唔止五條界欄。兩句唔可能同時照字面做到。
 *
 * 讀法：§7 嗰六條標題寫住「動（**scroll animation** 六條）」——
 * 佢哋管嘅係入場動效，即係「你 scroll 到，佢淡入」嗰種。
 * 而展卷係全站唯一一段**寫定嘅序列**，§9 逐幕逐幕寫死咗佢嘅節奏，
 * 亦都係全站唯一一次 pin scroll —— 嗰一刻讀者根本冇 scroll。
 *
 * 所以呢一幕行 §9，其餘全站行 §7。呢個分別記喺呢度，唔好散喺 CSS 度。
 */

/** 每條界欄畫幾耐（視覺 §9）。 */
export const RULE_MS = 240;

/** 條同條之間隔幾耐（視覺 §9）。 */
export const STAGGER_MS = 90;

/** 星落位：一粒點 240ms，比界欄密，因為佢哋係一齊落嘅。 */
export const STAR_MS = 240;
export const STAR_STAGGER_MS = 60;

export type Line = {
  /** 橫嘅畫闊度，直嘅畫高度 —— 同 E2 個「書」一樣，只用長度。 */
  axis: 'heng' | 'shu';
  /** 由邊度開始、去到邊，用百分比（相對盤面）。 */
  from: number;
  to: number;
  /** 另一條軸上面嘅位置。 */
  at: number;
};

/**
 * 十二條界欄。
 *
 * ⚠ 中間兩條係**斷開**嘅 —— 中宮係一格 2×2，界欄唔會由佢中間穿過。
 * 唔斷開嘅話，畫完之後同真盤面對唔上，交接嗰一格會跳。
 *
 * 四條外框 ＋ 四條全長 ＋ 四截半長 = 十二條。
 */
export const LINES: Line[] = [
  /* 外框 */
  { axis: 'heng', from: 0, to: 100, at: 0 },
  { axis: 'heng', from: 0, to: 100, at: 100 },
  { axis: 'shu', from: 0, to: 100, at: 0 },
  { axis: 'shu', from: 0, to: 100, at: 100 },
  /* 全長 */
  { axis: 'shu', from: 0, to: 100, at: 25 },
  { axis: 'shu', from: 0, to: 100, at: 75 },
  { axis: 'heng', from: 0, to: 100, at: 25 },
  { axis: 'heng', from: 0, to: 100, at: 75 },
  /* 畀中宮截斷嗰兩條 */
  { axis: 'shu', from: 0, to: 25, at: 50 },
  { axis: 'shu', from: 75, to: 100, at: 50 },
  { axis: 'heng', from: 0, to: 25, at: 50 },
  { axis: 'heng', from: 75, to: 100, at: 50 },
];

/** 十二宮喺 4×4 盤面上面嘅格（同 `Chart.tsx` 嘅 GRID 一樣）。 */
export const CELLS: [row: number, col: number][] = [
  [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 1], [2, 4],
  [3, 1], [3, 4],
  [4, 1], [4, 2], [4, 3], [4, 4],
];

/** 界欄畫完之後幾多毫秒。 */
export const LINES_MS = (LINES.length - 1) * STAGGER_MS + RULE_MS;

/** 成幕行完。之後先解 pin、先出正文。 */
export const ZHANJUAN_MS = LINES_MS + (CELLS.length - 1) * STAR_STAGGER_MS + STAR_MS;

export function lineDelay(i: number): number {
  return i * STAGGER_MS;
}

export function starDelay(i: number): number {
  return LINES_MS + i * STAR_STAGGER_MS;
}
