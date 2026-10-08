import 'server-only';
import { Converter } from 'opencc-js/t2cn';

/**
 * 簡體中文（2026-10-08）
 *
 * 成站嘅中文只寫一次（繁體）。簡體頁喺 server 用 OpenCC 由繁體轉：
 * 介面文字（messages）、命書正文、藏經閣、條款 —— 同英文一樣喺讀嗰陣轉，
 * 所以 DB 入面嘅書照舊係繁體（R-008：成書嗰陣鎖死）。
 *
 * 來源用 'tw'（台灣字形）：我哋嘅寫法係「裡」「著重」—— 'tw' 先會將「著重」轉做「着重」，
 * 而「著作」照留。目標 'cn'：只轉字，唔換詞（唔會將「軟體」變「软件」）。
 *
 * ⚠ 簡體字再轉一次唔會變（冪等），所以讀者用簡體打嘅名照舊。
 * ⚠ 呢個檔 server-only。client 元件自己砌嘅中文（命盤星名、宮名）用 `hans-zi.ts` 嗰張細表。
 */
const opencc = Converter({ from: 'tw', to: 'cn' });

/**
 * OpenCC 之後再修幾個位（2026-10-08 掃晒內容庫見到）：
 *   「藉」做動詞（藉交際應酬、藉酬酢）簡體寫「借」；「慰藉」「狼藉」「枕藉」「蘊藉」照留。
 *   「萬鍾」OpenCC 轉「锺」，通行寫「钟」。
 * 品牌名「星敘」全站一律用繁體寫法（Issac 2026-10-08）—— 係個名，唔係一句字。
 */
const toCn = (s: string): string =>
  opencc(s)
    .replace(/(?<![慰狼枕蕴])藉/g, '借')
    .replace(/锺/g, '钟')
    .replace(/星叙/g, '星敘');

/** 一句繁體轉簡體。 */
export function hans(s: string): string {
  return toCn(s);
}

export function isHans(locale: string): boolean {
  return locale === 'zh-Hans';
}

/** 簡體頁就轉，其他照舊。 */
export function zhFor(locale: string, s: string): string {
  return isHans(locale) ? toCn(s) : s;
}

/**
 * 成個物件入面嘅字串都轉（messages、傳畀 client 元件嘅 props）。
 * `keep`：唔好轉嘅鍵（例如 slug、宮名做 key 嘅欄 —— 佢哋係資料，唔係畀人睇嘅字）。
 */
export function deepHans<T>(v: T, keep: ReadonlySet<string> = new Set()): T {
  if (typeof v === 'string') return toCn(v) as T;
  if (Array.isArray(v)) return v.map((x) => deepHans(x, keep)) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = keep.has(k) ? x : deepHans(x, keep);
    return out as T;
  }
  return v;
}
