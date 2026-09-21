/**
 * 文案有幾多寫死咗喺 component 度（工單 E4 量到）
 *
 * ── 呢條規矩一早就寫低咗 ──
 *
 * README：「**所有文案放 `apps/web/messages/<locale>.json`，唔准寫死落 component**。」
 * 工單 A1 第三條 AC 亦都寫住同一句。
 *
 * 但由 D1 開始，每一張前端工單都寫死咗中文：藏經閣版式、認領頁、
 * 書齋、落款五步。冇人破過規矩 —— 只係冇人數過。
 *
 * ⚠ 呢度**唔 fail build**，同 G1 嗰陣量排盤引擎一樣：
 * 一條而家一定紅嘅檢查會即刻擋住所有工單，而一張例外表等於
 * 將一個已知違規寫成「批准咗」。所以擺一個**每次 build 都印出嚟嘅數**。
 * 佢係將來嗰張「文案搬去 messages」工單嘅驗收：個數要變零。
 *
 * ⚠ 呢個數係**粗量**：佢數嘅係「一行入面有中文字嘅字串同 JSX 文字」，
 * 唔識分一句文案同一個 `aria-label`。所以佢係一個趨勢，唔係一個清單。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src/app', 'src/components'];
const CJK = /[一-鿿]/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** 剷走註釋先數 —— D1／E2／G1／G2 四次教訓：掃描器要量宣告，唔係量散文。 */
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

let total = 0;
const perFile = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = code(readFileSync(file, 'utf8'))
      .split('\n')
      .filter((line) => CJK.test(line)).length;
    if (lines) {
      total += lines;
      perFile.push([relative('src', file).replaceAll('\\', '/'), lines]);
    }
  }
}

perFile.sort((a, b) => b[1] - a[1]);
const top = perFile.slice(0, 3).map(([f, n]) => `${f} ${n}`).join('、');

if (total === 0) {
  console.log('✓ 文案：component 入面冇寫死中文 —— 可以刪咗 check-copy.mjs 同埋 backlog 嗰條');
} else {
  console.log(
    `⚠ 寫死喺 component 嘅中文：${total} 行，分佈喺 ${perFile.length} 個檔（最多：${top}）` +
      '　（README · 工單 A1 AC 三 · 等一張「文案搬去 messages」工單）',
  );
}
