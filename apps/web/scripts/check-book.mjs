/**
 * 「書」元件驗收（工單 E2）
 *
 * ── 點解要開個瀏覽器 ──
 *
 * E2 四條 AC 入面，`test/book.test.ts` 掃得到嘅係「CSS 有冇寫錯嘢」。
 * 但另外兩條係**畫出嚟先存在**嘅：
 *
 *   「400px 唔會橫向滾」　　　　→ 要有個 viewport 先量得到
 *   「reduced-motion 直接到位」→ 要有個真 computed style 先睇得到
 *
 * D1 嗰三個 bug（英文瀏覽器 404、`.slice()` 截半個詞、`text-end` 由頭剪）
 * 全部係測試同 curl 捉唔到、影相先見到嘅。呢個 script 就係將嗰一類
 * 檢查寫成會 fail 嘅嘢，唔使靠人記得去睇。
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_BOOK_PORT ?? 3998);
const BASE = `http://localhost:${PORT}`;
const PATH = '/tokens/shu';
const STATES = ['架上書脊', '封面', '跨頁', '合上題名', '展開'];
const fail = [];

const server = await startServer(PORT);

function check(name, cond, detail) {
  if (!cond) fail.push(`${name}：${detail}`);
}

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(`${BASE}${PATH}`)).status === 200) return true;
    } catch {
      /* 未起身 */
    }
    await sleep(500);
  }
  return false;
}

/** 三格嘅實際闊度 ＋ 有冇被 display:none 收起。 */
const box = () =>
  ['.shu-verso', '.shu-ji', '.shu-recto'].map((sel) => {
    const el = document.querySelector(sel);
    const cs = getComputedStyle(el);
    return { w: el.getBoundingClientRect().width, gone: cs.display === 'none' };
  });

let browser;
try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }
  browser = await launchBrowser();

  /* ── 一、五個狀態，一個 transform 都冇 ───────────────── */
  const wide = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await wide.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await wide.waitForTimeout(600);

  for (const label of STATES) {
    await wide.getByRole('button', { name: label, exact: true }).click();
    await wide.waitForTimeout(700); // 轉場行完（--dur-2 = 520ms）

    /*
     * 「零 3D、零 scale、零 rotate」量嘅係跑出嚟嗰個 matrix，
     * 唔係 CSS 文字 —— 因為 transform 可以由 Tailwind class、
     * inline style、或者上面某一層帶落嚟。
     */
    const transforms = await wide.evaluate(() =>
      ['.shu', '.shu-ye', '.shu-ji', '.shu-mian', '.shu-nei'].flatMap((sel) =>
        [...document.querySelectorAll(sel)].map((el) => ({
          sel,
          t: getComputedStyle(el).transform,
          p: getComputedStyle(el).perspective,
        })),
      ),
    );
    for (const { sel, t, p } of transforms) {
      check(`${label} ${sel} transform`, t === 'none', t);
      check(`${label} ${sel} perspective`, p === 'none', p);
    }

    const [verso, ji, recto] = await wide.evaluate(box);
    if (label === '架上書脊') {
      check(label, ji.w > 28 && ji.w < 40, `書脊 ${ji.w}px，應該 34 左右`);
      check(label, recto.w === 0, `右頁 ${recto.w}px，架上應該係零`);
      check(label, verso.w > 0 && verso.w < 6, `書口 ${verso.w}px，應該 3px`);
    }
    if (label === '封面' || label === '合上題名') {
      check(label, verso.w === 0, `左頁 ${verso.w}px，合埋應該係零`);
      check(label, recto.w > 200, `封面 ${recto.w}px，太窄`);
      check(label, ji.w < 12, `書脊 ${ji.w}px，合埋應該收成一條邊`);
    }
    if (label === '跨頁' || label === '展開') {
      check(label, Math.abs(verso.w - recto.w) < 1, `兩版唔等闊：${verso.w} vs ${recto.w}`);
      check(label, verso.w > 200, `頁闊 ${verso.w}px，太窄`);
    }
  }

  /* 轉場係真係存在嘅，而且係 width —— 唔係靠冇動嚟過關 */
  const trans = await wide.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.shu-recto'));
    return { prop: cs.transitionProperty, dur: cs.transitionDuration };
  });
  check('轉場', trans.prop === 'width', `transition-property 係 ${trans.prop}`);
  check('轉場', trans.dur === '0.52s', `transition-duration 係 ${trans.dur}`);

  /*
   * ── 二、400px 唔會橫向滾 ────────────────────────────
   *
   * 「收成單頁」唔係細個字，係真係得一版：另外嗰版要 display:none。
   * 闊度零收唔算數 —— 讀屏仲會讀到佢。
   */
  const phone = await browser.newPage({ viewport: { width: 400, height: 860 } });
  await phone.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(600);

  for (const label of STATES) {
    await phone.getByRole('button', { name: label, exact: true }).click();
    await phone.waitForTimeout(700);
    const over = await phone.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`400px ${label}`, over <= 0, `橫向滾多咗 ${over}px`);

    if (label === '跨頁' || label === '展開') {
      const [verso, , recto] = await phone.evaluate(box);
      check(`400px ${label}`, verso.gone, '左頁應該 display:none，唔係闊度零');
      check(`400px ${label}`, !recto.gone && recto.w > 0, '右頁唔見咗');
    }
  }

  /*
   * ── 三、reduced-motion：直接到位，內容完整 ───────────
   *
   * 「直接」量嘅係 transition-duration 係咪 0s —— 唔係等佢行完再量，
   * 因為嗰種等法量到嘅係「快」，唔係「直接」。
   */
  const still = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  await still.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await still.waitForTimeout(400);

  const durs = await still.evaluate(() =>
    ['.shu-ye', '.shu-ji', '.shu-mian', '.shu-nei'].flatMap((sel) =>
      [...document.querySelectorAll(sel)].map((el) => ({
        sel,
        d: getComputedStyle(el).transitionDuration,
      })),
    ),
  );
  for (const { sel, d } of durs) check(`reduced-motion ${sel}`, d === '0s', `duration ${d}`);

  await still.getByRole('button', { name: '展開', exact: true }).click();
  const now = await still.evaluate(box); // 唔等 —— 撳完即刻量
  check('reduced-motion 展開', Math.abs(now[0].w - now[2].w) < 1, '撳完冇即刻到位');
  check('reduced-motion 展開', now[0].w > 200, `左頁得 ${now[0].w}px`);

  /* 內容完整：命盤十二宮同正文都要喺度 */
  const inside = await still.evaluate(() => ({
    gong: document.querySelectorAll('.shu-nei .gong').length,
    text: document.querySelector('.shu-verso .shu-nei')?.textContent?.trim().length ?? 0,
  }));
  check('reduced-motion 內容', inside.gong === 12, `命盤得 ${inside.gong} 宮`);
  check('reduced-motion 內容', inside.text > 40, `左頁正文得 ${inside.text} 個字`);

  /* ── 四、活樣板唔准畀人索引 ──────────────────────── */
  const html = await fetch(`${BASE}${PATH}`).then((r) => r.text());
  check('樣板 noindex', /name="robots" content="noindex/.test(html), '冇 noindex');
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 「書」元件驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 書：五態全部只用闊度、400px 收成單頁唔橫向滾、reduced-motion 直接到位');
