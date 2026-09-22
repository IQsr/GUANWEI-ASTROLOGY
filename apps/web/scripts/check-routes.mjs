/**
 * 真係開個 server 撳一撳（工單 D2 驗收）
 *
 * ── 點解要多呢一層 ──
 *
 * `check-lexicon-build.mjs` 掃 build 產出，`vitest` 測純函數。
 * 兩樣都過晒之後，`/sitemap.xml` 仍然可以喺 production 回 404 ——
 * D2 就係咁撞到嘅：
 *
 *   .next/server/app/sitemap.xml.body  ← 37 條 URL，內容啱晒
 *   .next/server/app/sitemap.xml.meta  ← {"status":404}
 *
 * 根層嘅 `[locale]` 動態段喺 build 期將 `/sitemap.xml` 當成一個 locale
 * render 咗個 404 出嚟，覆蓋咗真正嗰條 route。
 *
 * **冇人會特登去撳自己個 sitemap。** 所以要有嘢幫手撳。
 *
 * 呢個 script 起一個真 server，逐條 route 撳一次，對 status 同內容。
 */
import { startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * 全部 `/tokens/*` 樣板，由檔案系統自己數（工單 B16 順手修）
 *
 * ⚠ 呢度本來係一張人手維護嘅名單，而佢漏咗三條
 * （`/tokens/suidu`、`/tokens/weicai`、`/tokens/chongpai`）——
 * F2、F4、B16 各開一版，冇一版加返入去。
 *
 * 即係話「樣板唔准索引」呢條規矩，量緊嘅一直係舊嗰五版。
 * **一張要人記得去加嘅名單，就係一張會漏嘅名單。**
 * 而漏嘅代價係一版內部參考頁上得到 Google。
 *
 * 所以而家由 `src/app/[locale]/tokens` 自己行出嚟：下次開多一版，
 * 唔使記得，佢自動入數。
 */
const TOKENS_DIR = fileURLToPath(new URL('../src/app/[locale]/tokens', import.meta.url));
const TOKEN_PAGES = [
  '/tokens',
  ...readdirSync(TOKENS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `/tokens/${e.name}`)
    .sort(),
];

const PORT = Number(process.env.CHECK_PORT ?? 3999);
const BASE = `http://localhost:${PORT}`;
const fail = [];

const server = startServer(PORT);

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/lexicon`);
      if (r.status === 200) return true;
    } catch {
      /* 未起身 */
    }
    await sleep(500);
  }
  return false;
}

/**
 * 剩返讀者真係睇到嗰啲字。
 *
 * ⚠ 唔可以掃成份 HTML。第一次寫嘅時候就係咁，即刻報「認領頁出現咗
 * 『$』」—— 而嗰個 `$` 喺 React 嘅 flight payload 入面，唔喺版面上。
 *
 * 同 D1 嗰個「沒有生辰」、E2 嗰個「零 rotate」、G1 嗰個
 * 「唔好用 localStorage」一樣：**掃描器要量讀者見到嘅嘢，唔係量整份檔。**
 */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

function check(name, cond, detail) {
  if (!cond) fail.push(`${name}：${detail}`);
}

try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }

  /* ── 一、公開層要 200 ─────────────────────────────── */
  for (const path of [
    '/',
    '/lexicon',
    '/lexicon/star/%E7%B4%AB%E5%BE%AE',
    '/lexicon/palace/%E7%96%BE%E5%8E%84',
    '/lexicon/sihua/%E7%A5%BF',
    '/lexicon/ju/%E6%B0%B4%E4%BA%8C%E5%B1%80',
    '/sitemap.xml',
    '/robots.txt',
  ]) {
    const r = await fetch(`${BASE}${path}`);
    check(path, r.status === 200, `HTTP ${r.status}`);
  }

  /*
   * ── 二、英文瀏覽器要去得到藏經閣 ───────────────────
   *
   * D1 撞過：`Accept-Language: en-US` 之下，`as-needed` 嘅語言偵測
   * 會將 `/lexicon` 轉去 `/en/lexicon`，而嗰條 route 我哋唔出 → 404。
   * 而藏經閣係全站唯一嘅流量入口，一半訪客見到 404 就係一半流量。
   */
  const en = await fetch(`${BASE}/lexicon`, {
    headers: { 'accept-language': 'en-US,en;q=0.9' },
  });
  check('/lexicon (en 瀏覽器)', en.status === 200, `HTTP ${en.status}`);

  const enPrefixed = await fetch(`${BASE}/en/lexicon`, { redirect: 'manual' });
  check('/en/lexicon', enPrefixed.status === 301, `HTTP ${enPrefixed.status}，應該 301`);

  /* ── 三、sitemap 內容 ─────────────────────────────── */
  const xml = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check('sitemap 條數', locs.length === 37, `${locs.length} 條，應該 37（首頁 ＋ 目錄 ＋ 35 詞條）`);
  check('sitemap 中文 encode', locs.some((l) => l.includes('%E7%B4%AB%E5%BE%AE')), '搵唔到 encode 咗嘅紫微');
  for (const leak of ['/cast', '/shelf', '/book', '/claim', '/account', '/pay']) {
    check('sitemap 白名單', !locs.some((l) => l.includes(leak)), `私密層 ${leak} 漏咗入 sitemap`);
  }

  /*
   * ── 三之二、canonical 要撳得到 ─────────────────────
   *
   * D2 撞過：`encodeURIComponent(slug)` 喺一個已經 encode 咗嘅 param 上面
   * 再 encode 一次，出咗 `%25E7%25B4%25AB%25E5%25BE%25AE`。
   * 頁面照樣 200，meta 照樣有，測試照樣過 —— 但嗰條 canonical 係 404。
   *
   * 一條指去 404 嘅 canonical 比冇 canonical 更差。所以逐條撳一撳。
   */
  const sample = ['/lexicon/star/%E7%B4%AB%E5%BE%AE', '/lexicon/ju/%E6%B0%B4%E4%BA%8C%E5%B1%80'];
  for (const path of sample) {
    const html = await fetch(`${BASE}${path}`).then((r) => r.text());
    for (const [label, re] of [
      ['canonical', /<link rel="canonical" href="([^"]+)"/],
      ['og:url', /<meta property="og:url" content="([^"]+)"/],
    ]) {
      const href = html.match(re)?.[1];
      check(`${path} ${label}`, Boolean(href), '搵唔到');
      if (!href) continue;
      check(`${path} ${label} 冇雙重 encode`, !href.includes('%25'), href);
      const hit = await fetch(new URL(href).pathname ? `${BASE}${new URL(href).pathname}` : href);
      check(`${path} ${label} 撳得到`, hit.status === 200, `HTTP ${hit.status} → ${href}`);
    }
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    check(`${path} og:image`, Boolean(og), '搵唔到');
    if (og) {
      const img = await fetch(`${BASE}${new URL(og).pathname}`);
      check(`${path} og:image 撳得到`, img.status === 200, `HTTP ${img.status}`);
    }
  }

  /* ── 四、robots 內容 ──────────────────────────────── */
  const txt = await fetch(`${BASE}/robots.txt`).then((r) => r.text());
  for (const p of ['/cast', '/shelf', '/book', '/claim', '/account', '/pay', '/api']) {
    check('robots', txt.includes(`Disallow: ${p}`), `冇擋 ${p}`);
  }
  check('robots sitemap', /Sitemap:\s*\S+\/sitemap\.xml/.test(txt), '冇指去 sitemap');

  /*
   * ── 五、CTA 係一行細字 ───────────────────────────────
   *
   * 工單驗收：「CTA 係一行細字，唔係 banner 唔係彈窗。」
   * 呢個驗收寫得出，就量得到。
   */
  for (const path of ['/lexicon', '/lexicon/star/%E7%B4%AB%E5%BE%AE']) {
    const html = await fetch(`${BASE}${path}`).then((r) => r.text());
    const ctas = [...html.matchAll(/href="\/cast"/g)].length;
    check(`${path} CTA`, ctas === 1, `${ctas} 個 /cast 連結，應該剛好一個`);
    check(`${path} CTA 唔係彈窗`, !/<dialog|role="dialog"|aria-modal/.test(html), '有 dialog');
    check(`${path} CTA 唔係 banner`, !/\bfixed\b|\bsticky\b/.test(html), '有 fixed／sticky 定位');
    check(`${path} CTA 唔係按鈕`, !/btn-mo[^"]*"[^>]*>[^<]*<\/a>\s*$/.test(html), 'CTA 用咗主按鈕樣式');
  }

  /* ── 六、私密層唔准索引 ──────────────────────────── */

  /*
   * ⚠ 先證明佢數到嘢，再去量佢。
   *
   * `readdirSync` 一失手（改咗路徑、搬咗 `[locale]`），`TOKEN_PAGES`
   * 就淨返 `/tokens` 一條，而下面個迴圈照樣跑完、照樣冇 fail ——
   * 即係呢個 session 撞咗六次嗰樣嘢：**一個喺乜都冇之上通過嘅檢查**。
   */
  check('樣板名單', TOKEN_PAGES.length >= 8, `淨係數到 ${TOKEN_PAGES.length} 版樣板`);

  for (const path of [
    '/cast',
    '/claim',
    '/shelf',
    '/book/00000000-0000-0000-0000-000000000000',
    '/book/00000000-0000-0000-0000-000000000000/ming',
    /* 裁書（工單 G3）—— 私密層，而且係全站唯一有價錢嗰版。 */
    '/pay/00000000-0000-0000-0000-000000000000',
    ...TOKEN_PAGES,
  ]) {
    const res = await fetch(`${BASE}${path}`);
    check(`${path}`, res.status === 200, `HTTP ${res.status}`);
    const html = await res.text();
    check(`${path} noindex`, /name="robots" content="noindex/.test(html), '冇 noindex');
  }

  /*
   * ── 六之二、認領頁唔准出現價錢字眼 ─────────────────
   *
   * 架構 §6 硬規則：「『題名』之前唔准出現任何價錢或者『升級』字眼。」
   *
   * 兩版都要掃：`/cast`（落款，題名之前）同 `/claim`（認領，
   * 第一個位就係啱啱題完名）。一個喺嗰度講緊「升級」嘅版面，
   * 就係將付款提早咗一幕。
   */
  for (const path of ['/claim', '/cast']) {
    const html = await fetch(`${BASE}${path}`).then((r) => r.text());
    for (const word of ['升級', '免費試', '優惠', '限時', '£', '$', '訂閱']) {
      check(`${path} 唔賣嘢`, !visibleText(html).includes(word), `出現咗「${word}」`);
    }
  }

  /*
   * ── 六之三、價錢全站只准喺一個地方（工單 G3） ────────
   *
   * 上面兩條掃嘅係「題名之前」嗰兩版。但架構 §6 嗰條硬規則真正嘅
   * 意思係更加窄嘅：**價錢只應該喺 `/pay` 出現，一版都唔多。**
   *
   * 一個價錢喺書齋、喺命書、喺藏經閣頁尾出現，每一個都會有佢自己
   * 嘅理由（「畀人知幾錢啊嘛」），而加埋就係一個成日喺度叫你畀錢嘅網。
   * 所以唔係逐版加禁令，係全站掃，`/pay` 係唯一例外。
   *
   * ⚠ 呢條同 `test/pay.test.ts` 嗰條唔重複：嗰條掃 source（捉住
   * 一個未接線嘅常數），呢條掃**畫出嚟嗰版**（捉住由 DB、由
   * messages、由 Stripe 帶返嚟嘅字）。
   */
  const PRICEY = ['升級', '免費試', '優惠', '限時', '訂閱', 'US$', '£'];
  let scanned = 0;
  for (const path of TOKEN_PAGES.concat(['/', '/lexicon', '/cast', '/claim', '/shelf'])) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.headers.get('content-type')?.includes('text/html')) continue;
    const text = visibleText(await res.text());
    scanned++;
    for (const word of PRICEY) {
      check(`${path} 冇價錢`, !text.includes(word), `出現咗「${word}」`);
    }
  }
  /* 先證明佢掃到嘢 —— 一個掃咗零版嘅檢查會靜靜雞全綠。 */
  check('價錢掃描', scanned >= 10, `只掃到 ${scanned} 版`);
} finally {
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 路由驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 路由：公開層全 200、英文瀏覽器入得到、sitemap 37 條、私密層擋晒、CTA 一行細字');
