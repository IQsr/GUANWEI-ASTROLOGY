/**
 * 卷首驗收：連貫係量得到嘅（工單 UX1 · 視覺系統 §5 · 架構 §2）
 *
 * ── 點解要開多一層 ──
 *
 * Issac 講「唔夠連貫」。呢句聽落似一個感覺，但佢**全部量得到**：
 * 做到 G4 為止，七版頁各自寫咗一次頁頭，量出嚟係噉 ——
 *
 *   /shelf /cast /account   天頭 40px　版心左邊 124px
 *   其餘四版                天頭 104px　版心左邊 319px
 *
 * 即係由書齋撳入一本書，個標題向右跳 195px，而且上面嘅空位
 * 由 40 變 104。冇人會指得出係咩事，但每一下都覺得「唔順」。
 *
 * 而 104 : 64 = 8 : 5 係視覺系統 §5 唯一一條佢自己話「淨係呢一條，
 * 成版就唔似普通網站」嘅規則 —— 即係話跳出嚟嗰三版，跳走咗嘅正正
 * 係成套版式最貴嗰樣嘢。
 *
 * ── 呢一層量五樣 ──
 *
 *   一、每版都有一個卷首
 *   二、卷首嘅左邊界，**逐版一模一樣**
 *   三、天頭 104、地腳 64（§5）
 *   四、h1 嘅左邊界逐版一樣，字距一樣
 *   五、冇一版橫向滾
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_JUANSHOU_PORT ?? 3993);
const BASE = `http://localhost:${PORT}`;
const BOOK = '00000000-0000-0000-0000-000000000000';
const fail = [];

function check(name, cond, detail) {
  if (!cond) fail.push(`${name}：${detail}`);
}

/**
 * ⚠ 呢張名單係手寫嘅，而 B16 已經教過一次「手寫名單會漏」。
 *
 * 但呢度同嗰度唔同：嗰張係「全部 `/tokens/*`」，行得出嚟；
 * 呢張係「會出卷首嘅版」，而唔係每版都應該有（`/` 入齋特登冇）。
 * 所以改為**反面守住**：下面第六節掃全部 page.tsx，
 * 冇喺名單又冇明文豁免嘅，一律紅。
 */
const PAGES = [
  ['/lexicon', '藏經閣'],
  ['/lexicon/star/%E7%B4%AB%E5%BE%AE', '詞條'],
  ['/cast', '落款'],
  ['/shelf', '書齋'],
  ['/claim', '認領'],
  [`/book/${BOOK}`, '目次'],
  [`/book/${BOOK}/%E5%BA%8F`, '章'],
  [`/pay/${BOOK}`, '裁書'],
  ['/account', '設定'],
];

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

const server = await startServer(PORT);
let browser;
try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }
  browser = await launchBrowser();

  const seen = [];
  for (const [path, label] of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    /* 入場動畫做完先量 —— 視覺 §7：入場 900ms。 */
    await sleep(1400);

    const m = await page.evaluate(() => {
      const main = document.querySelector('main');
      const head = main?.querySelector(':scope > header');
      const h1 = document.querySelector('h1');
      const cs = main ? getComputedStyle(main) : null;
      const box = (el) => (el ? Math.round(el.getBoundingClientRect().left) : null);
      return {
        hasMain: Boolean(main),
        headX: box(head),
        headW: head ? Math.round(head.getBoundingClientRect().width) : null,
        padTop: cs?.paddingTop ?? null,
        padBottom: cs?.paddingBottom ?? null,
        h1X: box(h1),
        h1Tracking: h1 ? getComputedStyle(h1).letterSpacing : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    await page.close();

    check(`${label} main`, m.hasMain, '冇 <main>');
    check(`${label} 卷首`, m.headX !== null, '搵唔到卷首（main > header）');
    /* §5：天頭 : 地腳 = 8 : 5 → 104 / 64。 */
    check(`${label} 天頭`, m.padTop === '104px', `${m.padTop}，應該 104px`);
    check(`${label} 地腳`, m.padBottom === '64px', `${m.padBottom}，應該 64px`);
    check(`${label} 橫向滾`, m.overflow <= 0, `多咗 ${m.overflow}px`);
    seen.push({ label, ...m });
  }

  /*
   * ⚠ 先證明佢量到嘢。
   * 一個 fetch 全部仆街、`headX` 全部 null 嘅跑法，
   * 下面啲「全部一樣」會因為「全部都係 null」而通過。
   */
  check('掃描範圍', seen.length === PAGES.length, `只量到 ${seen.length} 版`);
  check('掃描範圍', seen.every((s) => s.headX !== null), '有版量唔到卷首');

  /* ── 二、卷首逐版對齊 ────────────────────────── */
  const headXs = [...new Set(seen.map((s) => s.headX))];
  check(
    '卷首對齊',
    headXs.length === 1,
    `左邊界有 ${headXs.length} 個值：` +
      seen.map((s) => `${s.label} ${s.headX}`).join('、'),
  );

  const headWs = [...new Set(seen.map((s) => s.headW))];
  check('卷首闊度', headWs.length === 1, `闊度有 ${headWs.length} 個值：${headWs.join('、')}`);

  /* ── 四、h1 逐版對齊 ────────────────────────── */
  const withH1 = seen.filter((s) => s.h1X !== null);
  check('h1 掃描範圍', withH1.length >= 5, `只有 ${withH1.length} 版有 h1`);

  const h1Xs = [...new Set(withH1.map((s) => s.h1X))];
  check(
    'h1 對齊',
    h1Xs.length === 1,
    `左邊界有 ${h1Xs.length} 個值：` + withH1.map((s) => `${s.label} ${s.h1X}`).join('、'),
  );

  /*
   * 字距：視覺系統 §4 幕標題 .16em。
   * ⚠ 之前藏經閣用 .06em —— 一個冇人記得點解嘅第三個值。
   */
  const tracks = [...new Set(withH1.map((s) => s.h1Tracking))];
  check('h1 字距', tracks.length === 1, `有 ${tracks.length} 個值：${tracks.join('、')}`);
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 卷首驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}

console.log('✓ 卷首：九版同一個左邊界、同一個天頭（104 / 64）、h1 同一個位同一個字距、冇一版橫向滾');
