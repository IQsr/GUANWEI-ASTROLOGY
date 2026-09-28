/**
 * 文案唔准寫死喺 code 度（工單 A1 AC 三 · 文案搬去 messages）
 *
 * ── 規矩 ──
 *
 * README：「**所有文案放 `apps/web/messages/<locale>.json`，唔准寫死落 component**。」
 *
 * 由 D1 到 G4 每張前端工單都寫死咗中文，冇人破規矩，只係冇人數。
 * 呢個 script 以前淨係印一個數（最高 367 行）；2026-09 四批搬完之後，
 * 佢變成一條**真嘅檢查**：
 *
 *   一、掃 `src/app`、`src/components`、`src/lib`（剷走註釋先掃）
 *   二、有中文字嘅檔，一定要喺下面兩張表之一，**而且寫明點解**
 *   三、表入面嘅檔**已經冇中文**，一樣紅 —— 例外表唔准越積越長
 *
 * ── 點解要例外表，唔係「零」──
 *
 * 唔係所有中文都係介面文案：宮位名、地支、章嘅 slug 係**內容資料**
 * （會交畀引擎、寫落本書）；伺服器 log 係寫畀我哋睇；`/tokens` 係開發用嘅樣板。
 * 呢啲搬去 messages 反而錯 —— 一個宮位名唔會因為讀者轉咗英文就變。
 *
 * ⚠ 加一條例外之前問自己：**讀者會唔會見到呢隻字？** 會嘅話佢係文案，
 * 要搬去 messages，唔好加入呢張表。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src/app', 'src/components', 'src/lib'];
const CJK = /[一-鿿]/;

/** 成類豁免：開發用樣板（noindex，唔係產品）。 */
const EXEMPT_PATTERNS = [
  [/^app\/\[locale\]\/tokens\//, '開發用樣板頁（/tokens，noindex）'],
  [/^components\/[A-Za-z]+Demo\.tsx$/, '樣板頁用嘅 Demo 元件'],
];

/** 逐個檔豁免。每個都要一句原因。 */
const ALLOWED = {
  /* ── 內容資料：會交畀引擎、寫落本書，唔跟讀者語言轉 ── */
  'components/Chart.tsx': '命盤：地支同宮位嘅格位（內容資料）',
  'components/Suidu.tsx': '隨讀：段落格名「開場」係資料鍵，唔顯示',
  'lib/suidu.ts': '隨讀：段落格名 → 盤面亮法（資料鍵）',
  'lib/mingshu.ts': '十二宮嘅閱讀次序（章嘅 slug）',
  'lib/chengshu.ts': '免費章 slug、章序用嘅中文數字（寫落本書嘅章名）',
  'lib/themes.ts': '主題入面嘅宮位名（章嘅 slug）；主題名本身喺 messages',
  'lib/zhu.ts': '註層術語：「化祿」等四化名（內容資料）',
  'lib/luokuan.ts': '出生地嘅中文名（交畀引擎、寫落書）同中文日期寫法；畫面上嘅地名喺 messages',
  'app/[locale]/cast/actions.ts': '序嘅 slug「序」（內容資料）',
  'app/[locale]/book/[bookId]/[chapter]/page.tsx': '段落格名預設「正文」（資料鍵）',

  /* ── 品牌同語言名：任何語言都一樣 ── */
  'lib/site.ts': '品牌「觀微」',
  'lib/locales.ts': '語言名用嗰種語言自己嘅寫法（「繁體中文」）',
  'components/LocaleSwitch.tsx': '「語言 · Language」刻意中英並列：睇唔明而家語言嘅人都要認得',

  /* ── 開發者先見到：log、錯誤、webhook、analytics 內部標籤 ── */
  'lib/env.ts': '環境變數錯誤（開發者訊息）',
  'lib/pay.ts': 'webhook 判斷原因（寫入 log）',
  'lib/pay.server.ts': 'Stripe 設定錯誤（開發者訊息）',
  'lib/account.server.ts': '刪除失敗 log',
  'lib/chengshu.server.ts': 'DB 回應錯誤（開發者訊息）',
  'lib/analytics.ts': '事件表嘅內部標籤（畀我哋睇 dashboard，唔畀讀者）',
  'app/api/stripe/webhook/route.ts': 'webhook log 同畀 Stripe 嘅回應',
};

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

const fail = [];
const seen = new Set();
let exempted = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative('src', file).replaceAll('\\', '/');
    const lines = code(readFileSync(file, 'utf8'))
      .split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => CJK.test(l));

    if (EXEMPT_PATTERNS.some(([re]) => re.test(rel))) {
      if (lines.length) exempted += 1;
      continue;
    }
    if (rel in ALLOWED) {
      seen.add(rel);
      if (lines.length === 0) {
        fail.push(`${rel}：喺例外表入面，但已經冇中文 —— 由例外表刪走佢`);
      }
      continue;
    }
    for (const [n, l] of lines.slice(0, 3)) {
      fail.push(`${rel}:${n}  ${l.trim().slice(0, 80)}`);
    }
    if (lines.length > 3) fail.push(`${rel}：…仲有 ${lines.length - 3} 行`);
  }
}

/* 例外表入面嘅檔唔存在（改咗名、刪咗）：一樣要執返張表 */
for (const rel of Object.keys(ALLOWED)) {
  if (!seen.has(rel)) fail.push(`${rel}：喺例外表入面，但個檔唔存在 —— 由例外表刪走佢`);
}

if (fail.length) {
  console.error('✗ 文案驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  console.error(
    '  讀者會見到嘅字 → 搬去 messages/<locale>.json；' +
      '真係資料或者開發者訊息 → 加入 scripts/check-copy.mjs 嘅例外表，寫明原因',
  );
  process.exit(1);
}

console.log(
  `✓ 文案：產品 code 冇寫死讀者文案（例外 ${Object.keys(ALLOWED).length} 個檔，每個有原因；樣板 ${exempted} 個檔）`,
);
