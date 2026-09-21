/**
 * 字體（視覺系統 §4）
 *
 * 三個角色：
 *   宋體  Noto Serif TC —— 中文，做骨
 *   西文  Spectral      —— 直立應力、楔形襯線，同宋體同一種呼吸
 *   工具  Noto Sans TC  —— 數字同細標籤，只做工具，唔上場
 *
 * 三個都由同一條 Google Fonts stylesheet 載，唔用 next/font。兩個原因：
 *
 * 1. CJK 唔適合 next/font。next/font 會喺 build 時將成個 subset 下載落嚟自
 *    host，而 'chinese-traditional' subset 係幾百個切片乘以每個字重 ——
 *    build 會變得好慢好重。用 stylesheet 就保留到 Google 嘅 unicode-range
 *    動態切片，一版嘢淨係 download 佢真係用到嗰幾十 KB。
 *
 * 2. 既然中文行緊 stylesheet，西文再用 next/font 自 host 就慳唔到第三方
 *    請求 —— 反而變成兩個來源。三個 family 併埋一條 URL，一個 request 搞掂。
 *
 * 升級路線（品牌字體定稿之後）：用 cn-font-split 自己切片再自 host 三個
 * family，咁就連最後一個第三方請求都冇埋 —— 同「只得兩個 essential cookie、
 * 唔要 cookie banner」嘅立場一致（架構 §10）。到時只需要改呢個檔案，
 * 同埋 layout 入面嗰兩行 <link>。
 */

export const FONT_STYLESHEET_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Noto+Serif+TC:wght@300;400;600;900' +
  '&family=Noto+Sans+TC:wght@400;500' +
  '&family=Spectral:wght@300;400;600' +
  '&display=swap';
