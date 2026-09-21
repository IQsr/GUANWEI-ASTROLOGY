/**
 * Client bundle 掃描（工單 G1）
 *
 * ── 一、會 fail build 嗰樣：service role key ──
 *
 * 嗰條 key `bypassrls`。一旦佢入咗 client bundle，`packages/db` 嗰套
 * RLS（十五條測試）就一次過失效 —— 而且冇任何錯誤訊息，個 app 照行。
 * `lib/env.ts` 擋住「貼咗入 NEXT_PUBLIC_」嗰條路；呢度掃嘅係產出本身。
 *
 * ── 二、會 fail build 嗰樣：排盤引擎 ──
 *
 * 架構 §9：「**排盤引擎唔准落 client bundle** —— 係資產，
 * 而且 server 行先可以鎖 engine_version、快取、重算。」
 *
 * G1 嗰陣量到佢喺度（60KB），但冇擺一條會紅嘅檢查：
 * 一條當時一定紅嘅檢查會即刻擋住 E3，而一張例外表等於將一個
 * 已知違規寫成「批准咗」。所以當時擺咗一個**每次 build 都印出嚟嘅數**。
 *
 * E4 修咗。個數變零，所以呢一段由「印個數」升做「紅」。
 *
 * ⚠ 真正嘅成因唔係 `/cast` 原型，係 `Chart.tsx` 為咗攞十二地支
 * 寫咗 `import { BRANCHES } from '@guanwei/ziwei'` —— 而總入口
 * 喺 module 頂層計 `SCHOOL_PROFILE`，要讀萬年曆表。
 * **由總入口攞一個常數，等於 import 成個引擎**，tree-shaking 救唔到。
 * 修法係開一個冇副作用嘅入口 `@guanwei/ziwei/contract` 畀 UI 用。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '.next/static/chunks';

function chunks(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return chunks(full);
    return name.endsWith('.js') ? [full] : [];
  });
}

const files = chunks(DIR);
if (files.length === 0) {
  console.error('✗ 搵唔到 client chunk —— 係咪未 build？');
  process.exit(1);
}

/* ── 一、秘密 ──────────────────────────────────────────── */
const SECRETS = ['SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_', 'service_role'];
const leaked = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const needle of SECRETS) {
    if (text.includes(needle)) leaked.push(`${file} 入面有「${needle}」`);
  }
}

if (leaked.length) {
  console.error('✗ client bundle 漏咗嘢出嚟：');
  for (const l of leaked) console.error('  ' + l);
  console.error('  service role key bypass 晒 RLS —— 轆咗嗰條 key，再搵返邊度 import 錯咗。');
  process.exit(1);
}

/* ── 二、引擎（唔准入 client）────────────────────────── */
const MARKS = ['破軍', '廉貞', '擎羊', '陀羅', '節氣', '立春'];
const engine = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  /*
   * 三個或以上先算 —— 一兩個字有可能係文案（例如詞條、樣章）。
   * 三個同時出現喺一個 chunk 度，就係星表或者曆表。
   */
  const found = MARKS.filter((m) => text.includes(m));
  if (found.length >= 3) {
    engine.push(
      `${file.split('/').pop()} ${(Buffer.byteLength(text) / 1024).toFixed(0)}KB（${found.join('、')}）`,
    );
  }
}

if (engine.length) {
  console.error('✗ 排盤引擎入咗 client bundle（架構 §9）：');
  for (const e of engine) console.error('  ' + e);
  console.error('  多數係有人由 `@guanwei/ziwei` 總入口攞嘢 —— UI 要行 `@guanwei/ziwei/contract`。');
  console.error('  server 行先鎖得到 engine_version（charts.engine_version · G1）。');
  process.exit(1);
}

console.log(`✓ bundle：client 入面冇 service role key、冇排盤引擎（掃咗 ${files.length} 個 chunk）`);
