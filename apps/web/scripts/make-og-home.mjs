/**
 * 首頁 OG 圖（2026-10-04 · 改名星敘之後重做）
 *
 * 參考實體書效果圖：墨綠底、燙金標誌同字、一條燙金細線。
 * 同 `make-og.mjs` 一樣用 Playwright 影一版真 HTML：顏色由 globals.css 抽，標誌由 BrandMark 嘅 path 抄
 * （改標誌要兩邊一齊改 —— 標誌係過渡版本，正式版到咗再統一）。
 *
 *   node scripts/make-og-home.mjs   →   public/og.png
 */
import { launchBrowser } from './_server.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'public/og.png';
const css = readFileSync('src/app/globals.css', 'utf8');
const tok = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? '';
const jade = tok('jade');
const gilt = tok('gilt');
const gilt2 = tok('gilt-2');
const rule = tok('jade-rule');
const site = readFileSync('src/lib/site.ts', 'utf8');
const MARK = site.match(/export const MARK = '([^']+)'/)[1];
const LATIN = site.match(/export const LATIN = '([^']+)'/)[1];

const mark = (size) => `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="none" stroke="${gilt}" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="50" cy="50" r="44" stroke-width="1.6"/>
  <ellipse cx="50" cy="50" rx="43" ry="15" stroke-width="1" transform="rotate(-24 50 50)"/>
  <path d="M50 20 L57 33 L57 76 L43 76 L43 33 Z" stroke-width="1.6"/>
  <circle cx="78" cy="36" r="2.6" fill="${gilt}" stroke="none"/>
  <circle cx="23" cy="64" r="1.8" fill="${gilt}" stroke="none"/>
  <circle cx="66" cy="83" r="1.4" fill="${gilt}" stroke="none"/>
</svg>`;

const html = `<!doctype html><meta charset="utf-8">
<style>
  html,body { margin:0; padding:0 }
  body {
    width:1200px; height:630px; background:${jade}; color:${gilt};
    font-family:"Noto Serif TC","Noto Serif CJK TC","Source Han Serif TC","PMingLiU",serif;
    display:flex; align-items:center; gap:88px; padding:0 120px; box-sizing:border-box;
    position:relative; overflow:hidden;
  }
  /* 背景一個大圓軌，淡淡哋（效果圖嗰種星盤線） */
  .orbit { position:absolute; right:-330px; top:-140px; opacity:.22 }
  .brand { display:flex; flex-direction:column; gap:18px }
  h1 { margin:0; font-size:104px; font-weight:500; letter-spacing:.24em; line-height:1 }
  .latin { font-size:20px; letter-spacing:.62em; color:${gilt2} }
  .line { width:340px; height:1px; background:${rule}; margin:22px 0 10px }
  p { margin:0; font-size:32px; letter-spacing:.2em; line-height:1.7 }
  .kind { font-size:22px; letter-spacing:.3em; color:${gilt2}; margin-top:6px }
</style>
<svg class="orbit" width="900" height="900" viewBox="-450 -450 900 900" fill="none" stroke="${gilt}">
  <circle r="420" stroke-width="1"/><circle r="320" stroke-width="1"/><circle r="220" stroke-width="1"/><circle r="120" stroke-width="1"/>
  <ellipse rx="430" ry="150" stroke-width="1" transform="rotate(-24)"/>
  <line x1="-450" y1="0" x2="450" y2="0" stroke-width=".6"/><line x1="0" y1="-450" x2="0" y2="450" stroke-width=".6"/>
  <circle cx="300" cy="-120" r="5" fill="${gilt}" stroke="none"/><circle cx="-160" cy="200" r="3.5" fill="${gilt}" stroke="none"/>
</svg>
${mark(220)}
<div class="brand">
  <h1>${MARK}</h1>
  <div class="latin">${LATIN}</div>
  <div class="line"></div>
  <p>以星為序，以你為章。</p>
  <div class="kind">紫微斗數・專屬個人命書</div>
</div>`;

const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: 'load' });
await p.waitForTimeout(400);
const shot = await p.screenshot({ type: 'png' });
await b.close();
writeFileSync(OUT, shot);
console.log(`✓ ${OUT}（${(shot.length / 1024).toFixed(0)} KB，墨綠 ${jade} 燙金 ${gilt}）`);
