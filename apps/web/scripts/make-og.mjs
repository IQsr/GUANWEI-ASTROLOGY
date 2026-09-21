/**
 * 藏經閣 OG 圖（工單 D2）
 *
 * ── 點解係一張，唔係每條一張 ──
 *
 * 每條詞條一張 OG 圖（`ImageResponse`）會靚好多，但佢要喺 runtime 載一個
 * CJK 字體檔。Google Fonts 喺呢個環境連唔到，而自己 bundle 一個
 * Noto Serif CJK 係十幾二十 MB —— 為咗一張分享圖，唔值。
 *
 * 所以：一張藏經閣共用圖。分享一條詞條連結，卡片顯示「藏經閣 · 觀微」，
 * 而標題同摘要由 `<meta og:title>` / `<og:description>` 逐條出 ——
 * 卡片入面真正有資訊嗰兩行本來就唔喺張圖度。
 *
 * ── 點解用 Playwright 影，唔係畫 SVG ──
 *
 * 張圖要用返站上嘅 token（紙色、墨色、宋體、朱砂方印）。
 * 手畫一次 SVG 就係第二套值，日後改 token 佢唔會跟 —— 又多一處要記得同步。
 * render 一版真 HTML 再影，用嘅就係同一份 `globals.css`。
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'public/og-lexicon.png';
const css = readFileSync('src/app/globals.css', 'utf8');

/* 由 globals.css 抽返 token —— 唔喺呢度再寫一次 hex。 */
const tok = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? '';
const paper = tok('paper');
const ink = tok('ink');
const ink2 = tok('ink-2');
const ink3 = tok('ink-3');
const rule = tok('rule');
const cinnabar = tok('cinnabar');

const html = `<!doctype html><meta charset="utf-8">
<style>
  @page { margin: 0 }
  html,body { margin:0; padding:0 }
  body {
    width:1200px; height:630px; background:${paper}; color:${ink};
    font-family:"Noto Serif CJK TC","Noto Serif TC",serif; font-weight:300;
    display:flex; flex-direction:column; justify-content:center;
    padding:0 104px; box-sizing:border-box; letter-spacing:.02em;
  }
  .cap { font-size:19px; letter-spacing:.42em; color:${ink3} }
  h1 { font-size:88px; font-weight:600; letter-spacing:.1em; margin:26px 0 0 }
  .line { width:100%; height:1px; background:${rule}; margin:40px 0 }
  p { font-size:27px; line-height:1.9; color:${ink2}; margin:0; max-width:900px }
  .foot { display:flex; align-items:center; gap:22px; margin-top:44px }
  .yin { background:${cinnabar}; padding:3px; line-height:0 }
  .yin > span {
    display:grid; place-items:center; gap:2px; border:1px solid ${paper};
    padding:9px 7px; color:${paper}; font-weight:600; font-size:23px; line-height:1.06;
  }
  .brand { font-size:21px; letter-spacing:.34em; color:${ink3} }
</style>
<div class="cap">GUAN WEI</div>
<h1>藏經閣</h1>
<div class="line"></div>
<p>紫微斗數的詞條。每一條都列明出處，引文逐字抄自原書，可以自己核。</p>
<div class="foot">
  <span class="yin"><span><span>觀</span><span>微</span></span></span>
  <span class="brand">觀微 · 藏經閣</span>
</div>`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: 'load' });
await p.waitForTimeout(400);
const shot = await p.screenshot({ type: 'png' });
await b.close();

writeFileSync(OUT, shot);
console.log(`✓ ${OUT}（${(shot.length / 1024).toFixed(0)} KB，紙 ${paper} 墨 ${ink} 朱砂 ${cinnabar}）`);
