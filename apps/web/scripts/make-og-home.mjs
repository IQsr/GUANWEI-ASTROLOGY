/**
 * 首頁 OG 圖（2026-10-04 · 改名星敘之後重做）
 *
 * 參考實體書效果圖：墨綠底、燙金標誌同字、一條燙金細線。
 * 同 `make-og.mjs` 一樣用 Playwright 影一版真 HTML：顏色由 globals.css 抽，標誌由 BrandMark 嘅 path 抄
 * （改標誌要兩邊一齊改）。2026-11-15 換成「星敘」圓印。
 *
 *   node scripts/make-og-home.mjs   →   public/og.png（中文）＋ public/og-en.png（英文）
 *
 * 2026-11-16 加英文版：Issac 發現分享出去張卡淨係得中文。英文版個印照舊（印文永遠係「星敘」），
 * 大字換成 STELLOGUE，下面兩行用返英文首頁嗰句。Playfair Display 由 node_modules 直接嵌入，
 * 同網站英文標題同一隻字。同日加埋日文版（og-ja.png）：Noto Serif JP，同網站日文內文同一隻字，
 * 用 file:// 開（見 _og.mjs）。
 */
import { launchBrowser } from './_server.mjs';
import { shoot, fontLinks } from './_og.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('src/app/globals.css', 'utf8');
const tok = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? '';
const jade = tok('jade');
const gilt = tok('gilt');
const gilt2 = tok('gilt-2');
const rule = tok('jade-rule');
const site = readFileSync('src/lib/site.ts', 'utf8');
const MARK = site.match(/export const MARK = '([^']+)'/)[1];
const LATIN = site.match(/export const LATIN = '([^']+)'/)[1];

const mark = (size) => `<svg viewBox="0 0 200 200" width="${size}" height="${size}" fill="none" stroke="${gilt}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <defs><clipPath id="yin"><circle cx="100" cy="100" r="88"/></clipPath></defs>
  <g clip-path="url(#yin)">
    <rect x="76" y="28" width="48" height="26" rx="6"/><path d="M76 41 L124 41"/>
    <path d="M66 60 L66 68 L200 68"/><path d="M100 60 L100 94"/><path d="M0 81 L134 81"/><path d="M0 94 L200 94"/>
    <path d="M40 128 L40 116 Q40 108 48 108 L88 108 Q96 108 96 116 L96 128"/><path d="M68 108 L68 200"/><path d="M54 122 L82 122"/><path d="M0 136 L84 136"/><path d="M52 150 L52 166"/><path d="M84 150 L84 166"/>
    <path d="M136 106 L136 119"/><path d="M136 113 L200 113"/>
    <path d="M112 130 L160 130 L160 144 L140 144 L140 166 L122 166 L122 200"/><path d="M120 155 L156 155 L156 200"/>
  </g>
  <circle cx="100" cy="100" r="90" stroke-width="5.5"/>
</svg>`;

const playfair = readFileSync(
  'node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2',
).toString('base64');
const en = JSON.parse(readFileSync('messages/en.json', 'utf8'));
const ja = JSON.parse(readFileSync('messages/ja.json', 'utf8'));

/** 每個語言一張。`brand` 係右邊嗰疊字。 */
const CARDS = [
  {
    out: 'public/og.png',
    brand: `<h1>${MARK}</h1>
  <div class="latin">${LATIN}</div>
  <div class="line"></div>
  <p>以星為序，以你為章。</p>
  <div class="kind">紫微斗數・專屬個人命書</div>`,
  },
  {
    out: 'public/og-en.png',
    cls: 'en',
    brand: `<h1>${LATIN}</h1>
  <div class="line"></div>
  <p>${en.ruzhai.headline.join('<br>')}</p>
  <div class="kind">Zi Wei Dou Shu · Your personal book of Chinese astrology</div>`,
  },
  {
    out: 'public/og-ja.png',
    cls: 'ja',
    fonts: ['noto-serif-jp'],
    brand: `<h1>${MARK}</h1>
  <div class="latin">${LATIN}</div>
  <div class="line"></div>
  <p>${ja.ruzhai.headline.join('')}</p>
  <div class="kind">紫微斗数・あなただけの命書</div>`,
  },
];

const page = ({ brand, cls = '', fonts = [] }) => `<!doctype html><meta charset="utf-8">
${fontLinks(fonts)}
<style>
  @font-face { font-family:"Playfair Display"; font-weight:400 900; src:url(data:font/woff2;base64,${playfair}) format("woff2") }
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
  /* 英文版：字母闊過漢字，字距收細；標語用 Playfair，同網站英文標題一樣 */
  body.en { gap:72px; padding:0 96px; font-family:"Playfair Display",Georgia,serif }
  .en h1 { font-size:78px; letter-spacing:.2em; font-weight:500 }
  .en .line { margin:26px 0 14px }
  .en p { font-size:38px; letter-spacing:.01em; line-height:1.4 }
  .en .kind { font-size:19px; letter-spacing:.06em; margin-top:16px }
  /* 日文版：Noto Serif JP；假名疏啲，字距收少少先唔會甩行 */
  body.ja { font-family:"Noto Serif JP Variable","Noto Serif JP",serif }
  .ja p { font-size:31px; letter-spacing:.12em }
  .ja .kind { letter-spacing:.2em }
</style>
<body class="${cls}">
<svg class="orbit" width="900" height="900" viewBox="-450 -450 900 900" fill="none" stroke="${gilt}">
  <circle r="420" stroke-width="1"/><circle r="320" stroke-width="1"/><circle r="220" stroke-width="1"/><circle r="120" stroke-width="1"/>
  <ellipse rx="430" ry="150" stroke-width="1" transform="rotate(-24)"/>
  <line x1="-450" y1="0" x2="450" y2="0" stroke-width=".6"/><line x1="0" y1="-450" x2="0" y2="450" stroke-width=".6"/>
  <circle cx="300" cy="-120" r="5" fill="${gilt}" stroke="none"/><circle cx="-160" cy="200" r="3.5" fill="${gilt}" stroke="none"/>
</svg>
${mark(220)}
<div class="brand">
  ${brand}
</div>`;

const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const card of CARDS) {
  const shot = await shoot(p, page(card), { viaFile: Boolean(card.fonts?.length) });
  writeFileSync(card.out, shot);
  console.log(`✓ ${card.out}（${(shot.length / 1024).toFixed(0)} KB，墨綠 ${jade} 燙金 ${gilt}）`);
}
await b.close();
