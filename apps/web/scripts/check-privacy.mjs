/**
 * 私隱驗收（工單 H1 · 架構 §10）
 *
 * ── 點解要開個真 server ──
 *
 * 架構 §10 寫住「只用 session + 主題兩個 essential cookie → 可以唔要
 * cookie banner」。呢句係一個**關於 runtime 嘅聲稱**，而 runtime 嘅嘢
 * 只有 runtime 答得到：cookie 係 framework 發嘅，唔係我哋寫嘅。
 *
 * ⚠ 事實上呢句一直唔準確，而係呢個 script 第一次量到：
 *
 *   · 主題**唔係 cookie** —— 佢喺 localStorage（`lib/local.ts`）
 *   · 有一個冇人計過嘅 cookie：`NEXT_LOCALE`，next-intl 發嘅
 *
 * 兩樣都唔算違規（兩個都係 strictly necessary，唔使 consent），
 * 但一份講到明「只得兩個」而實際係另外兩樣嘅文件，就係我哋
 * 批評緊競品嗰件事嘅同一個形狀。所以而家由呢度量，文件跟住量度寫。
 *
 * ── 呢一層量四樣 ──
 *
 *   一、全站發過嘅 cookie，逐個要喺名單度
 *   二、瀏覽器會打去邊啲第三方 host
 *   三、`docs/privacy.md` 有冇講齊量到嗰幾個
 *   四、生辰唔准出現喺任何網址（連結、表單、轉向）
 */
import { startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const PORT = Number(process.env.CHECK_PRIVACY_PORT ?? 3994);
const BASE = `http://localhost:${PORT}`;
const DOC = fileURLToPath(new URL('../../../docs/privacy.md', import.meta.url));
const fail = [];

function check(name, cond, detail) {
  if (!cond) fail.push(`${name}：${detail}`);
}

/**
 * 准發嘅 cookie。
 *
 * ⚠ 呢張名單加一個名，就係加一個要喺 `docs/privacy.md` 交代嘅嘢，
 * 而且要重新問一次「佢係咪 strictly necessary」。
 * 唔係 strictly necessary 就要 cookie banner —— 嗰個係一個產品決定，
 * 唔應該喺一個 npm 套件嘅預設值入面靜靜雞發生。
 */
const ALLOWED_COOKIES = [
  { name: 'NEXT_LOCALE', why: 'next-intl 記住語言 —— 只喺協商到語言嗰陣發' },
  { prefix: 'sb-', why: 'Supabase session —— 冇 Supabase 環境變數就唔會出現' },
];

/**
 * 准打去嘅第三方 host。
 *
 * ⚠ 一個第三方 host 就係一個「用戶部機直接同佢講嘢」嘅對象 ——
 * 冇 cookie 都好，佢一樣收到 IP 同 User-Agent。
 */
const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const ROUTES = [
  '/',
  '/lexicon',
  /*
   * ⚠ 裁書嗰版要掃（工單 G3）。
   *
   * 收卡嘅版最容易多一個第三方：Stripe.js、風控 script、3DS iframe。
   * 我哋揀咗 hosted checkout 就係為咗唔使載佢哋 —— 而「揀咗」
   * 同「真係冇」之間差一個量度。冇 session 嘅話呢一版會出
   * 「一時裁不開」／「這個瀏覽器沒有書」，照樣量得到有冇第三方。
   */
  '/pay/00000000-0000-0000-0000-000000000000',
  '/lexicon/star/%E7%B4%AB%E5%BE%AE',
  '/lexicon/palace/%E5%91%BD%E5%AE%AE',
  '/cast',
  '/claim',
  '/shelf',
  '/tokens',
  '/tokens/shu',
  '/tokens/mingshu',
];

/** 生辰形狀：日期、時分、經緯度。出現喺網址度就係漏咗出去。 */
const BIRTHY = /\b(19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}:\d{2}\b|\blng=|\blat=/;

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(`${BASE}/lexicon`)).status === 200) return true;
    } catch {
      /* 未起身 */
    }
    await sleep(500);
  }
  return false;
}

const server = startServer(PORT);
try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }

  const cookies = new Set();
  const hosts = new Set();
  let fetched = 0;

  for (const path of ROUTES) {
    for (const al of ['', 'en-GB,en;q=0.9']) {
      const res = await fetch(`${BASE}${path}`, {
        redirect: 'manual',
        headers: al ? { 'accept-language': al } : {},
      });
      fetched++;

      for (const line of res.headers.getSetCookie?.() ?? []) {
        cookies.add(line.split('=')[0].trim());
      }

      /* 轉向目標一樣要睇 —— 一條帶住生辰嘅 Location 一樣入 log。 */
      const loc = res.headers.get('location');
      if (loc) check(`${path} 轉向`, !BIRTHY.test(loc), loc);

      if (!res.headers.get('content-type')?.includes('text/html')) continue;
      const html = await res.text();

      /*
       * ⚠ 只掃網址，唔掃正文。
       *
       * 樣板頁嘅正文入面本來就有一個生辰（`/tokens` 嗰張樣板盤）——
       * 嗰個係內容，唔係洩漏。會洩漏嘅係佢**去咗網址度**：
       * 網址會入 server log、入 referrer、入書籤、入分享。
       */
      for (const m of html.matchAll(/(?:href|src|action)="([^"]+)"/g)) {
        const url = m[1];
        check(`${path} 網址`, !BIRTHY.test(url), url);
        if (/^https?:\/\//.test(url)) hosts.add(new URL(url).host);
      }
    }
  }

  /*
   * ⚠ 先證明佢量到嘢。
   *
   * 呢個 session 撞咗七次「一個喺乜都冇之上通過嘅檢查」：
   * server 起唔到、fetch 全部仆街、regex 一個都唔配 ——
   * 三種情況下面全部 assertion 都會靜靜雞通過。
   */
  check('掃描範圍', fetched >= ROUTES.length * 2, `只 fetch 咗 ${fetched} 次`);
  check('掃描範圍', cookies.size >= 1, '一個 cookie 都冇見到 —— 多數係冇真係行過');
  check('掃描範圍', hosts.size >= 1, '一個外部 host 都冇見到 —— 多數係冇真係行過');

  /* ── 一、cookie 逐個要喺名單度 ────────────────── */
  for (const name of cookies) {
    const ok = ALLOWED_COOKIES.some((a) => (a.prefix ? name.startsWith(a.prefix) : a.name === name));
    check('cookie', ok, `冇宣告過嘅 cookie「${name}」—— 加之前先問佢使唔使 consent`);
  }

  /* ── 二、第三方 host ───────────────────────── */
  for (const host of hosts) {
    if (host.startsWith('localhost')) continue;
    check('第三方', ALLOWED_HOSTS.includes(host), `冇宣告過嘅第三方「${host}」`);
  }

  /*
   * ── 二之二、撈用戶資料嗰啲版，唔准烘成靜態（工單 G4） ──
   *
   * ⚠ 呢個窿係做 `/account` 嗰陣量到嘅，而佢一直喺度。
   *
   * `/shelf` 冇宣告過 `dynamic`，所以 `pnpm build` 將佢**預先
   * render 咗**落 `.next/server/app/<locale>/shelf.html`。
   *
   * 佢僥倖冇事，因為 build 期冇 Supabase 環境變數：`publicEnv()`
   * 喺掂到 `cookies()` 之前就掟咗，於是 Next 由頭到尾見唔到一個
   * dynamic API，安心噉將「一時搵不到」嗰版烘咗做靜態頁。
   *
   * 即係話呢個保護係一個**意外**：環境變數一行得通，烘出嚟嗰版
   * 就係 build 期撈到嘅嘢；而且烘咗之後，所有人、所有 session
   * 見到同一份 HTML，直到下次部署為止。
   *
   * 一版講緊「你嘅書」嘅頁，唔應該有一份大家共用嘅 HTML。
   *
   * 邊幾版算？**由檔案系統自己答**：一版 page.tsx 如果 import 咗
   * 一個 `*.server` adapter，佢就係喺 server 度撈緊用戶資料。
   * 唔使人手維護一張名單（B16 嗰課）。
   */
  const APP = fileURLToPath(new URL('../src/app/[locale]', import.meta.url));
  const OUT = fileURLToPath(new URL('../.next/server/app', import.meta.url));

  const pages = [];
  const walk = (dir, route) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${route}/${e.name}`);
      else if (e.name === 'page.tsx') pages.push({ file: join(dir, e.name), route });
    }
  };
  walk(APP, '');

  const dataPages = pages.filter((p) =>
    /from '@\/lib\/[\w.]+\.server'/.test(readFileSync(p.file, 'utf8')),
  );

  /* 先證明佢搵到嘢 —— 一個數到零版嘅檢查會靜靜雞全綠。 */
  check('動態掃描', pages.length >= 10, `只搵到 ${pages.length} 版 page.tsx`);
  check('動態掃描', dataPages.length >= 3, `只搵到 ${dataPages.length} 版撈用戶資料`);

  for (const p of dataPages) {
    /* 動態段（`[bookId]`）本來就唔會烘成一個固定檔名，跳過。 */
    if (p.route.includes('[')) continue;
    for (const locale of ['zh-Hant', 'en']) {
      const baked = join(OUT, locale, `${p.route.slice(1)}.html`);
      check(
        `${p.route} 唔准烘成靜態`,
        !existsSync(baked),
        `${locale}${p.route}.html 存在 —— 加 export const dynamic = 'force-dynamic'`,
      );
    }
  }

  /* ── 三、文件要同量度對得返 ──────────────────── */
  const doc = readFileSync(DOC, 'utf8');
  for (const name of cookies) {
    check('privacy.md', doc.includes(name), `量到 cookie「${name}」，但 docs/privacy.md 冇提過佢`);
  }
  for (const host of hosts) {
    if (host.startsWith('localhost')) continue;
    check('privacy.md', doc.includes(host), `量到第三方「${host}」，但 docs/privacy.md 冇提過佢`);
  }

  /*
   * ⚠ 反向一樣要對：文件講咗而實際冇嘅，一樣係講大話。
   *
   * 一份寫住「我哋用 Plausible」而根本冇接嘅私隱政策，同一份
   * 漏咗一個 cookie 嘅私隱政策，喺讀者眼中係同一件事。
   */
  for (const a of ALLOWED_COOKIES) {
    const label = a.name ?? a.prefix;
    const seen = [...cookies].some((c) => (a.prefix ? c.startsWith(a.prefix) : c === a.name));
    if (!seen) {
      console.log(`  · 名單有「${label}」但今次冇見到 —— ${a.why}`);
    }
  }
} finally {
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 私隱驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}

console.log('✓ 私隱：cookie 逐個宣告過、第三方得 Google Fonts、生辰冇入任何網址、文件同量度對得返');
