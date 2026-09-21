/**
 * 站台常數。
 *
 * metadataBase 要有絕對 URL 先出到合法嘅 OG 圖連結。Vercel 會填
 * NEXT_PUBLIC_SITE_URL；本機開發冇就 fallback 去 localhost。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * 全站唯一一張 OG 圖，只喺入齋（/）用（架構 §9）。
 *
 * 其餘所有頁 —— 命書、書架、排盤、認領、帳號、付款 —— 一律 noindex
 * 而且冇 OG。命書唔分享，一張預覽圖都唔應該漏出去。
 */
export const OG_IMAGE = '/og.png';

/**
 * 藏經閣嘅 OG 圖（工單 D2）。
 *
 * ⚠ 架構 §1 寫住「分享：**完全唔分享** → 命書冇 public link、冇 OG、全部 noindex」。
 * 嗰句講嘅係**命書**。藏經閣係公開層 —— 佢冇個人資料，
 * 而且係全站唯一嘅流量入口，所以佢應該分享得，亦都應該有卡片。
 *
 * 兩層嘅分別唔係「一個鬆啲一個緊啲」，係**入面有冇人嘅生辰**。
 *
 * 一張，唔係每條一張：每條一張要喺 runtime 載 CJK 字體，
 * 而自己 bundle 一個 Noto Serif CJK 係十幾二十 MB。
 * 卡片入面真正有資訊嗰兩行（標題、摘要）本來就由 meta 出，唔喺張圖度。
 *
 * 張圖由 `scripts/make-og.mjs` 用返 `globals.css` 嘅 token render ——
 * 唔係手畫，所以改 token 佢跟得返。
 */
export const OG_LEXICON = '/og-lexicon.png';

/**
 * 品牌字。**唔跟語言變。**
 *
 * 「觀微」係一個記號，唔係一句文案 —— 同 logo 一樣，出咗英文版都仲係
 * 「觀微」，下面嗰行 GUAN WEI 先係拼音。印亦都一樣：印文永遠係呢兩個字。
 * （試過由 messages 攞，英文版個印就變成一串直排字母。）
 */
export const MARK = '觀微';
