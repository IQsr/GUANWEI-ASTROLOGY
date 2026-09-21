/**
 * 合書題名嘅時序（工單 E5 · 視覺系統 §9）
 *
 * ── 呢一幕係全站情感高點，所以佢嘅時間係規格，唔係手感 ──
 *
 * 視覺 §9：「墨滲寫名 → **停 1.2 秒** → 朱砂落印。」
 *
 * 中間嗰 1.2 秒係成幕最重要嗰部分：**乜都唔郁。**
 * 一版嘢由頭到尾都喺度動，就冇嘢係重要嘅；停一停，
 * 落印嗰一下先有份量。所以嗰個停頓唔係「兩段動畫之間嘅空隙」，
 * 佢自己就係一段。
 *
 * 呢度攞出嚟做常數，係因為 `scripts/check-naming.mjs` 要對返
 * 真瀏覽器嘅 computed style —— 量嘅係 `animation-delay`，
 * 唔係「睇落差唔多」。
 */

/** 墨滲寫名。同 `--dur-4` 一樣 —— 入齋「觀微」兩個字都係呢個時間。 */
export const INK_MS = 1600;

/** ⚠ 完全靜止。呢一段唔可以縮 —— 縮咗成幕就變咗一串動畫。 */
export const STILL_MS = 1200;

/** 朱砂落印。同 `--dur-2`。 */
export const SEAL_MS = 520;

/** 落印幾時開始。 */
export const SEAL_DELAY_MS = INK_MS + STILL_MS;

/** 成幕行完。之後本書先撳得 —— 之前撳唔郁（AC：唔自動翻開，用戶自己撳）。 */
export const NAMING_MS = SEAL_DELAY_MS + SEAL_MS;
