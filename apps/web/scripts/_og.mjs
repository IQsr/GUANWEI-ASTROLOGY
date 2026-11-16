/**
 * OG 圖共用嘅影相步驟（make-og-home.mjs、make-og.mjs）。
 *
 * 中文版用 setContent ＋ 系統字（一路都係咁，張圖逐 byte 唔變）。
 * 日文版要 Noto Serif JP：fontsource 將佢分成百幾個 subset 檔，冇辦法嵌 base64，
 * 所以 `fonts` 有嘢嘅卡會寫一個臨時 HTML 落 apps/web，再用 file:// 開，
 * 等 <link> 可以直接讀 node_modules 入面嘅字體 CSS。
 */
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = '.og-tmp.html';

/** fontsource 套件名 → <link>。只喺 file:// 模式有用。 */
export const fontLinks = (names) =>
  names.map((n) => `<link rel="stylesheet" href="node_modules/@fontsource-variable/${n}/index.css">`).join('');

export async function shoot(page, html, { viaFile = false } = {}) {
  if (viaFile) {
    writeFileSync(TMP, html);
    try {
      await page.goto(pathToFileURL(resolve(TMP)).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      return await page.screenshot({ type: 'png' });
    } finally {
      rmSync(TMP, { force: true });
    }
  }
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return page.screenshot({ type: 'png' });
}
