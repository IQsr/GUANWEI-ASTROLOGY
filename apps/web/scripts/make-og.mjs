/**
 * 藏經閣 OG 圖（工單 D2）
 *
 * ── 點解係一張，唔係每條一張 ──
 *
 * 每條詞條一張 OG 圖（`ImageResponse`）會靚好多，但佢要喺 runtime 載一個
 * CJK 字體檔。Google Fonts 喺呢個環境連唔到，而自己 bundle 一個
 * Noto Serif CJK 係十幾二十 MB —— 為咗一張分享圖，唔值。
 *
 * 所以：一張藏經閣共用圖。分享一條詞條連結，卡片顯示「藏經閣 · 星敘」，
 * 而標題同摘要由 `<meta og:title>` / `<og:description>` 逐條出 ——
 * 卡片入面真正有資訊嗰兩行本來就唔喺張圖度。
 *
 * ── 點解用 Playwright 影，唔係畫 SVG ──
 *
 * 張圖要用返站上嘅 token（紙色、墨色、宋體、朱砂方印）。
 * 手畫一次 SVG 就係第二套值，日後改 token 佢唔會跟 —— 又多一處要記得同步。
 * render 一版真 HTML 再影，用嘅就係同一份 `globals.css`。
 *
 * 2026-11-16 加英文（og-lexicon-en.png）：字由 messages 攞，朱砂方印照舊係「星敘」，
 * 用 Playfair Display（見 _og.mjs）。冇日文：日文藏經閣未有，/ja/lexicon 會轉去中文。
 */
import { launchBrowser } from './_server.mjs';
import { shoot, fontLinks } from './_og.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('src/app/globals.css', 'utf8');

/* 由 globals.css 抽返 token —— 唔喺呢度再寫一次 hex。 */
const tok = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? '';
const paper = tok('paper');
const ink = tok('ink');
const ink2 = tok('ink-2');
const ink3 = tok('ink-3');
const rule = tok('rule');
const cinnabar = tok('cinnabar');
/* 品牌字由 site.ts 攞（2026-10-04 改名星敘）—— 唔喺呢度再寫一次 */
const site = readFileSync('src/lib/site.ts', 'utf8');
const MARK = site.match(/export const MARK = '([^']+)'/)[1];
const LATIN = site.match(/export const LATIN = '([^']+)'/)[1];

const msg = (l) => JSON.parse(readFileSync(`messages/${l}.json`, 'utf8')).lexicon;
const en = msg('en');

const CARDS = [
  { out: 'public/og-lexicon.png', title: '藏經閣', intro: '紫微斗數的詞條。每一條都列明出處，引文逐字抄自原書，可以自己核。', brand: `${MARK} · 藏經閣` },
  { out: 'public/og-lexicon-en.png', cls: 'en', fonts: ['playfair-display'], title: en.title, intro: en.intro, brand: `${LATIN} · ${en.title.toUpperCase()}` },
];

const page = ({ title, intro, brand, cls = '', fonts = [] }) => `<!doctype html><meta charset="utf-8">
${fontLinks(fonts)}
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
  body.en { font-family:"Playfair Display Variable",Georgia,serif; font-weight:400; letter-spacing:0 }
  .en h1 { font-weight:600; letter-spacing:.04em }
  .en p { font-size:28px; line-height:1.6; max-width:960px }
  .en .yin { font-family:"Noto Serif CJK TC","Noto Serif TC",serif }
  .en .brand { font-size:18px; letter-spacing:.3em }
</style>
<body class="${cls}">
<div class="cap">${LATIN}</div>
<h1>${title}</h1>
<div class="line"></div>
<p>${intro}</p>
<div class="foot">
  <span class="yin"><span>${[...MARK].map((c) => `<span>${c}</span>`).join('')}</span></span>
  <span class="brand">${brand}</span>
</div>`;

const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const card of CARDS) {
  const shot = await shoot(p, page(card), { viaFile: Boolean(card.fonts?.length) });
  writeFileSync(card.out, shot);
  console.log(`✓ ${card.out}（${(shot.length / 1024).toFixed(0)} KB，紙 ${paper} 墨 ${ink} 朱砂 ${cinnabar}）`);
}
await b.close();
