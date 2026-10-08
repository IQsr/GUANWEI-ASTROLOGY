/**
 * 字體（重新設計第一期 · 參考稿「字體」；2026-10-08 改為自己 host）
 *
 * 角色：
 *   宋體  Noto Serif TC／SC  —— 標題同命書正文
 *   黑體  Noto Sans TC／SC   —— 內文、工具字、數字
 *   西文  Playfair Display   —— STELLOGUE 同英文標語
 *
 * ── 點解唔再用 Google Fonts ──
 *
 * 一、私隱：熱連結 Google Fonts 會將讀者 IP 送去 Google（LG München I，2022 判 GDPR 違規）。
 * 二、大陸：fonts.googleapis.com 經常載唔到，簡體版（東南亞、大陸讀者）會成版走樣。
 * 三、CSP 少兩個外部 host —— 全站唔再連任何第三方。
 *
 * ── 點解用 Fontsource 嘅可變字型 ──
 *
 * 同 Google 一樣按 unicode-range 切片（每隻約一百片），瀏覽器淨係下載嗰版用到嘅字；
 * 可變字型一套片包晒所有字重（200–900），唔使每個字重各一套 —— 五隻加埋約 22MB 喺 server，
 * 讀者一版通常只下載幾十 KB。只有 woff2。
 *
 * ⚠ family 名多咗「Variable」（例：'Noto Serif TC Variable'），globals.css 嘅 stack 用呢個名。
 *   SC 嗰兩隻宣告咗但只有簡體頁嘅 stack 用到 —— 冇用到嘅 @font-face 唔會下載。
 */
import '@fontsource-variable/noto-serif-tc';
import '@fontsource-variable/noto-sans-tc';
import '@fontsource-variable/noto-serif-sc';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/playfair-display';
