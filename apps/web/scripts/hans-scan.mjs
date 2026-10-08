/**
 * 簡體頁有冇漏咗繁體字（2026-10-08）
 *
 * 攞每版 HTML，淨係睇讀者見到嘅字（正文、title、aria-label、alt、placeholder），
 * 用 OpenCC 再轉一次：轉完唔同，即係嗰度仲有繁體字未轉。
 * 用法：node scripts/hans-scan.mjs [base]   （預設 http://localhost:3000）
 */
import { Converter } from 'opencc-js/t2cn';

const toCn = Converter({ from: 'tw', to: 'cn' });

export function visibleText(html) {
  const attrs = [...html.matchAll(/\s(?:title|aria-label|alt|placeholder|content)="([^"]*)"/g)].map((m) => m[1]);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, '\n');
  return [body, ...attrs].join('\n').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
}

/**
 * 品牌標誌照用繁體「星敘」（logo、印、頁名）——
 * 同英文版照用「星敘」一樣，係個標誌唔係一句字。內文入面嘅品牌名就跟簡體（星叙）。
 */
const BRAND = /星敘|^敘$/g;

/** 回仲有繁體字嘅句（去重）。 */
export function leftovers(html) {
  const out = new Set();
  for (const line of visibleText(html).split('\n')) {
    const t = line.trim();
    const u = t.replace(BRAND, '');
    if (u && /[一-鿿]/.test(u) && toCn(u) !== u) out.add(t.length > 60 ? t.slice(0, 60) + '…' : t);
  }
  return [...out];
}

if (process.argv[1]?.endsWith('hans-scan.mjs')) {
  const base = process.argv[2] ?? 'http://localhost:3000';
  const routes = process.argv.slice(3).length ? process.argv.slice(3) : [
    '/zh-Hans', '/zh-Hans/cast', '/zh-Hans/sample', '/zh-Hans/lexicon', '/zh-Hans/lexicon/star/紫微',
    '/zh-Hans/privacy', '/zh-Hans/terms', '/zh-Hans/shelf', '/zh-Hans/claim', '/zh-Hans/account',
  ];
  let bad = 0;
  for (const r of routes) {
    const res = await fetch(base + encodeURI(r), { redirect: 'follow' });
    const left = leftovers(await res.text());
    console.log(`${res.status} ${r}  ${left.length ? `✗ ${left.length}` : '✓'}`);
    for (const l of left.slice(0, 8)) console.log('    ' + l);
    bad += left.length;
  }
  process.exit(bad ? 1 : 0);
}
