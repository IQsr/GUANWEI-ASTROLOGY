/**
 * 藏經閣 build 後掃描（工單 D1 驗收）
 *
 * 兩條 AC 都係**build 出嚟嘅嘢**嘅性質，唔係原始碼嘅性質：
 *
 *   「32 條全部 build 得出靜態頁」—— 要數 .html
 *   「冇任何個人資料，可公開索引」—— 要掃 .html 入面有冇漏
 *
 * 所以呢個掃描接喺 `next build` 後面，唔係做一條 unit test。
 * 一條 unit test 證明得到 function 啱，證明唔到個 build 產出啱。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '.next/server/app/zh-Hant/lexicon';
const fail = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

let pages;
try {
  pages = walk(ROOT);
} catch {
  console.error(`✗ 搵唔到 ${ROOT} —— 要先行 next build`);
  process.exit(1);
}

/* ── 一、35 條詞條 ＋ 1 版目錄 ───────────────────────────── */
const EXPECTED_ENTRIES = 35;
if (pages.length !== EXPECTED_ENTRIES) {
  fail.push(`詞條頁 ${pages.length} 版，應該 ${EXPECTED_ENTRIES} 版`);
}
const index = '.next/server/app/zh-Hant/lexicon.html';
try {
  statSync(index);
} catch {
  fail.push('搵唔到藏經閣目錄頁');
}

/* ── 二、可公開索引 ─────────────────────────────────────── */
for (const p of [index, ...pages]) {
  const html = readFileSync(p, 'utf8');
  if (!/<meta name="robots" content="index, follow"\/>/.test(html)) {
    fail.push(`${p}：冇開 robots index`);
  }

  /*
   * ⚠ 個人資料掃描：掃**值**，唔係掃字眼。
   *
   * 第一版寫成掃「出生」「生辰」呢啲字，一跑即刻三十六版全部紅 ——
   * 因為每一版個 footer 都寫住「沒有生辰、沒有排盤、沒有帳號」，
   * 而命宮詞條講五行局點嚟嗰陣本來就要提「出生月」。
   *
   * 兩樣都係**詞義**，唔係某一個人嘅資料。
   * 一個會 flag 咗「我哋冇收生辰」呢句嘅掃描器，量緊嘅係錯嘅嘢。
   *
   * 真正漏得出去嘅係**值**：一個日期、一個虛歲、一個盤 id、一條規則 id。
   * 詞條頁講詞義，呢啲值一個都唔應該出現。
   */
  const leaks = [
    ['虛歲數值', /虛歲\s*[0-9０-９]/],
    ['大限區間', /[0-9０-９]{1,3}\s*[-–—~]\s*[0-9０-９]{1,3}\s*歲/],
    ['西曆日期', /(19|20)[0-9]{2}\s*[-/年]/],
    ['月日', /[0-9]{1,2}\s*月\s*[0-9]{1,2}\s*日/],
    ['盤 id', /chart:\/\//],
    ['fixture', /fixture:\/\//],
    ['流派指紋', /zhongzhou-v1@/],
    ['規則庫指紋', /\br[0-9]+@[0-9a-f]{8,}/],
    ['規則 id', /\b(base|sihua|sanfang|geju|mod|sha|structure|frame|l3)\.[^\s"<，。]+/],
    ['插槽標記', /\[(章首|開場|結構|牽動|擾動|留白|過場)\]/],
  ];
  /* 只掃畀人睇嘅文字，唔掃 script/style —— 嗰啲係 framework 出嘅。 */
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ');
  for (const [name, re] of leaks) {
    const m = visible.match(re);
    if (m) fail.push(`${p}：漏咗${name}「${m[0]}」`);
  }
}

if (fail.length) {
  console.error('✗ 藏經閣驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log(`✓ 藏經閣：${pages.length} 版詞條 ＋ 1 版目錄，全部靜態、可索引、冇個人資料`);
