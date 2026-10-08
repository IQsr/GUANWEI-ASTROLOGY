import 'server-only';

/**
 * `/tokens/*` 開唔開（2026-10-08 security 檢查 🟠2）
 *
 * 樣板頁係開發用：設計系統、元件、定時辰驗證頁。正式站唔應該見到 ——
 * 唔止係 noindex，係 404；入面嘅 server action（排十二個盤）亦都唔行，
 * 因為 action 有自己嘅公開 endpoint，頁面 404 都 call 得到。
 *
 * 開發模式一定開；production 要 `GUANWEI_TOKENS=1`（驗收腳本 `scripts/_server.mjs` 會設）。
 * ⚠ 喺 runtime 讀，唔係 build 嗰陣：同一個 build，驗收開、正式站關。
 */
export function tokensEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.GUANWEI_TOKENS === '1';
}
