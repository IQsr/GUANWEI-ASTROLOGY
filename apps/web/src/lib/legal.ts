/**
 * 條款及私隱政策（2026-09-29 · Issac：起盤之前彈窗同意，同意記落本書）
 *
 * ── 版本 ──
 *
 * `LEGAL_VERSION` 係讀者同意嗰份文字嘅版本。改咗 `/terms` 或者 `/privacy` 嘅實質內容，
 * 就要改呢個日期 —— 讀者下次起盤會再見到彈窗，本書記住新版本（DB `books.terms_version`）。
 * 改錯字唔使改版本。
 *
 * ── ⚠ 未定嘅幾樣係明顯嘅假值 ──
 *
 * 營運者名稱、聯絡電郵、適用法律都未定。同 `PRICE.placeholder` 一樣：
 * 寫一個似層似樣嘅值會喺截圖入面扮到自己係真嘅，所以寫〔方括號〕，
 * 而且 `placeholder: true` 由測試守住 —— 定咗真值就改呢度同熄咗佢。
 *
 * ⚠ 唔係法律意見。上線收錢之前要搵人睇（docs/privacy.md、docs/pay.md）。
 */
export const LEGAL_VERSION = '2026-10-08';

export const LEGAL = {
  operator: '〔營運者名稱〕',
  contact: '〔聯絡電郵〕',
  governingLaw: '〔適用法律〕',
  placeholder: true,
} as const;

/** 呢部瀏覽器有冇同意過而家呢個版本。 */
export function hasConsented(stored: string | null): boolean {
  return stored === LEGAL_VERSION;
}
