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
 *   三、天頭 64、地腳 40（§5 嘅 8 : 5；重新設計加咗 72px 導覽之後由 104 / 64 收細）
 *   四、h1 嘅左邊界逐版一樣，字距一樣
 *   五、冇一版橫向滾
 *
 * ── 2026-10-15：分開紙頁同相頁 ──
 *
 * 書房改版（書齋、藏經閣、設定搬入同一間書房）係 Issac 特登推翻舊規矩嘅：
 * 藏經閣同書齋張相要**貼住**頂嘅導覽列（`.jing-ye`、`.juan.zhai-ye` 都 padding-top: 0），
 * 標題寫喺相上面，唔再係版心左邊一行卷首。用舊規矩量佢哋，一定紅 —— 但紅嘅唔係錯。
 *
 * 所以而家分兩類，憑 <main> 嘅 class 分（唔憑路徑：書齋撈唔到書嗰陣係一版普通紙頁，
 * 冇 DB 嘅機度量到嘅就係嗰版）：
 *
 *   紙頁（其餘全部，包括設定 —— 設定係書桌上嘅暗木板，但卷首照舊）
 *     一至四全部照舊，一個 px 都唔讓。
 *   相頁（`.jing-ye` 藏經閣、詞條；`.zhai-ye` 書齋）
 *     天頭 0（相貼頂，量住佢唔好有人「執返」做 64）、地腳 40；
 *     標題各自對自己嘅設計：藏經閣置中、詞條同正文同一條邊、書齋寫喺書櫃上面嗰幅牆。
 *   兩類一齊：h1 字距 .16em、冇橫向滾。
 *
 * ⚠ 字距量嘅係「字距 ÷ 字號」，唔係 px。
 * 之前報「三個值（9.6、6.22、6.08px）」其實全部都係 .16em —— 只係藏經閣用 display 字號、
 * 書齋個名跟住張相縮放。比 px 會將「字大咗」誤當「字距走咗」。
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_JUANSHOU_PORT ?? 3993);
const BASE = `http://localhost:${PORT}`;
const BOOK = '00000000-0000-0000-0000-000000000000';
const fail = [];
let paper = [];
let photo = [];

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
      const h1cs = h1 ? getComputedStyle(h1) : null;
      const box = (el) => (el ? Math.round(el.getBoundingClientRect().left) : null);
      const h1r = h1?.getBoundingClientRect();
      return {
        hasMain: Boolean(main),
        photo: main ? /\b(jing-ye|zhai-ye)\b/.test(main.className) : false,
        headX: box(head),
        headW: head ? Math.round(head.getBoundingClientRect().width) : null,
        padTop: cs?.paddingTop ?? null,
        padBottom: cs?.paddingBottom ?? null,
        h1X: box(h1),
        h1Mid: h1r ? Math.round(h1r.left + h1r.width / 2) : null,
        h1Track: h1cs ? parseFloat(h1cs.letterSpacing) / parseFloat(h1cs.fontSize) : null,
        h1OnWall: Boolean(h1?.closest('.jia-tou')),
        juanX: box(document.querySelector('.jing-juan')),
        mid: Math.round(document.documentElement.clientWidth / 2),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    await page.close();

    check(`${label} main`, m.hasMain, '冇 <main>');
    /*
     * §5：天頭 : 地腳 = 8 : 5。
     * ⚠ 由 104 / 64 改做 64 / 40（重新設計第一期）：頁頂而家有一條 72px 導覽，
     * 天頭由導覽底計起。比例冇變，變嘅係起點。
     * 相頁冇天頭：張相就係天頭（見頂嘅說明）。
     */
    const tian = m.photo ? '0px' : '64px';
    check(`${label} 天頭`, m.padTop === tian, `${m.padTop}，應該 ${tian}`);
    check(`${label} 地腳`, m.padBottom === '40px', `${m.padBottom}，應該 40px`);
    check(`${label} 橫向滾`, m.overflow <= 0, `多咗 ${m.overflow}px`);
    if (!m.photo) check(`${label} 卷首`, m.headX !== null, '搵唔到卷首（main > header）');
    seen.push({ label, ...m });
  }

  /*
   * ⚠ 先證明佢量到嘢。
   * 一個 fetch 全部仆街、`headX` 全部 null 嘅跑法，
   * 下面啲「全部一樣」會因為「全部都係 null」而通過。
   */
  check('掃描範圍', seen.length === PAGES.length, `只量到 ${seen.length} 版`);
  paper = seen.filter((s) => !s.photo);
  photo = seen.filter((s) => s.photo);
  check('掃描範圍', paper.length >= 5, `紙頁只有 ${paper.length} 版（${paper.map((s) => s.label).join('、')}）`);
  check('掃描範圍', paper.every((s) => s.headX !== null), '有紙頁量唔到卷首');

  /* ── 相頁：標題對自己嘅設計 ────────────────────── */
  for (const s of photo) {
    check(`${s.label} h1`, s.h1X !== null, '相頁冇 h1');
    if (s.label === '藏經閣') {
      check('藏經閣 h1 置中', Math.abs(s.h1Mid - s.mid) <= 1, `中線 ${s.h1Mid}，版中 ${s.mid}`);
    } else if (s.label === '詞條') {
      check('詞條 h1 對正文', s.h1X === s.juanX, `名 ${s.h1X}、正文 ${s.juanX}，應該同一條邊`);
    } else if (s.label === '書齋') {
      check('書齋 h1', s.h1OnWall, '個名唔喺書櫃上面嗰幅牆（.jia-tou）');
    } else {
      check(`${s.label} 相頁`, false, '未講明呢版相頁個標題應該點對 —— 喺上面加一條');
    }
  }

  /* ── 二、卷首逐版對齊（紙頁） ──────────────────── */
  const headXs = [...new Set(paper.map((s) => s.headX))];
  check(
    '卷首對齊',
    headXs.length === 1,
    `左邊界有 ${headXs.length} 個值：` +
      paper.map((s) => `${s.label} ${s.headX}`).join('、'),
  );

  const headWs = [...new Set(paper.map((s) => s.headW))];
  check('卷首闊度', headWs.length === 1, `闊度有 ${headWs.length} 個值：${headWs.join('、')}`);

  /* ── 四、h1 逐版對齊（紙頁）；字距全部 ─────────── */
  const withH1 = paper.filter((s) => s.h1X !== null);
  check('h1 掃描範圍', withH1.length >= 4, `只有 ${withH1.length} 版紙頁有 h1`);

  const h1Xs = [...new Set(withH1.map((s) => s.h1X))];
  check(
    'h1 對齊',
    h1Xs.length === 1,
    `左邊界有 ${h1Xs.length} 個值：` + withH1.map((s) => `${s.label} ${s.h1X}`).join('、'),
  );

  /*
   * 字距：視覺系統 §4 幕標題 .16em。
   * ⚠ 之前藏經閣用 .06em —— 一個冇人記得點解嘅第三個值。
   * 量 em（字距 ÷ 字號）、包埋相頁：字號可以唔同，字距嘅比例唔可以。
   */
  const off = seen.filter((s) => s.h1Track !== null && Math.abs(s.h1Track - 0.16) > 0.002);
  check('h1 字距', off.length === 0, off.map((s) => `${s.label} ${s.h1Track.toFixed(3)}em`).join('、') + '，應該 .16em');
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 卷首驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}

console.log(
  `✓ 卷首：${paper.length} 版紙頁同一個左邊界、同一個天頭（64 / 40）、h1 同一個位；` +
    `${photo.length} 版相頁貼頂、標題各就各位；h1 全部 .16em、冇一版橫向滾`,
);
