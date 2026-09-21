/**
 * 展卷驗收（工單 E6 · 視覺系統 §9）
 *
 * 三條 AC 入面兩條要開瀏覽器：
 *
 *   界欄每條 240ms、stagger 90ms　→ 量 computed animation-duration / delay
 *   全站唯一一次 pin scroll　　　　→ 量 body 嘅 overflow，行完要解返
 *
 * 第三條（唔用 spinner）掃 CSS，喺 `test/zhanjuan.test.ts`。
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_ZHAN_PORT ?? 3993);
const BASE = `http://localhost:${PORT}`;
const PATH = '/tokens/zhanjuan';
const fail = [];

/* 同 `src/lib/zhanjuan.ts` 對返 —— 嗰度改咗呢度就要爆。 */
const RULE_MS = 240;
const STAGGER_MS = 90;
const LINES = 12;
const LINES_MS = (LINES - 1) * STAGGER_MS + RULE_MS;
const ZHANJUAN_MS = LINES_MS + 11 * 60 + 240;

const server = startServer(PORT);

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

let browser;
try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  /* ⚠ 唔好等太耐 —— 成幕 2.1 秒，等完就乜都量唔到。 */
  await page.waitForSelector('.zhan', { timeout: 10_000 });

  /*
   * ── 一、界欄每條 240ms、相隔 90ms ──────────────────
   *
   * 量 computed style，唔係「睇落差唔多」。
   * 十二條逐條量 delay：第 n 條要喺 n × 90ms。
   */
  const lines = await page.evaluate(() =>
    [...document.querySelectorAll('.zhan-xian')].map((el) => {
      const cs = getComputedStyle(el);
      return { dur: cs.animationDuration, delay: cs.animationDelay, axis: el.dataset.axis };
    }),
  );
  check('十二條界欄', lines.length === LINES, `${lines.length} 條`);
  lines.forEach((l, i) => {
    check(`第 ${i + 1} 條 240ms`, l.dur === `${RULE_MS / 1000}s`, l.dur);
    check(
      `第 ${i + 1} 條喺 ${i * STAGGER_MS}ms 開始`,
      l.delay === `${(i * STAGGER_MS) / 1000}s`,
      l.delay,
    );
  });

  /*
   * ── 二、界欄係畫出嚟，唔係淡入 ─────────────────────
   *
   * 一條淡入嘅線係一條本來就喺度嘅線；呢一幕講嘅係「而家先有」。
   * 所以量：動畫改嘅係長度（width / height），唔係 opacity。
   * 而且成幕一個 scale / rotate 都冇（同 E2 個「書」一樣）。
   */
  /*
   * ⚠ 唔好用「而家有幾闊」嚟量。
   *
   * 第一版係量第一條界欄嘅闊度，期望佢近乎零 —— 但佢 delay 係 0ms、
   * 只跑 240ms，等 script 行到嗰陣佢一早畫完。**一個同動畫賽跑嘅檢查，
   * 量到嘅係 script 幾時行到，唔係動畫做緊乜。**
   *
   * 所以改為問瀏覽器嗰個動畫本身改緊邊個 property。
   */
  const painted = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.zhan-xian')];
    const props = new Set();
    for (const el of els) {
      for (const anim of el.getAnimations()) {
        for (const frame of anim.effect.getKeyframes()) {
          for (const key of Object.keys(frame)) {
            if (!['offset', 'computedOffset', 'easing', 'composite'].includes(key)) props.add(key);
          }
        }
      }
    }
    return { props: [...props], transforms: els.map((el) => getComputedStyle(el).transform) };
  });
  check('界欄係畫長度出嚟', painted.props.some((p) => p === 'width' || p === 'height'), painted.props.join('、') || '冇動畫');
  check('界欄唔係淡入', !painted.props.includes('opacity'), painted.props.join('、'));
  for (const t of painted.transforms) check('界欄冇 transform', t === 'none', t);

  /*
   * ── 三、⚠ 全站唯一一次 pin scroll ──────────────────
   *
   * 行緊嗰陣鎖住，行完要**解返**。
   * 一個鎖咗就冇解嘅 scroll，係一版讀唔到嘅書 ——
   * 而呢一幕之後正正就係成本書最長嗰一版。
   */
  const during = await page.evaluate(() => getComputedStyle(document.body).overflow);
  check('展卷期間鎖住 scroll', during === 'hidden', during);

  /* 星要喺界欄畫完之後先落。 */
  const stars = await page.evaluate(() =>
    [...document.querySelectorAll('.zhan-dian > i')].map((el) => getComputedStyle(el).animationDelay),
  );
  check('十二粒星', stars.length === 12, `${stars.length} 粒`);
  check('第一粒喺界欄畫完之後', stars[0] === `${LINES_MS / 1000}s`, stars[0] ?? '冇');

  await page.waitForTimeout(ZHANJUAN_MS + 900);

  const after = await page.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    zhan: Boolean(document.querySelector('.zhan')),
    gong: document.querySelectorAll('.gong').length,
  }));
  check('行完解返 scroll', after.overflow !== 'hidden', after.overflow);
  check('行完收返個骨架', !after.zhan, '骨架仲喺度');
  check('行完出真盤', after.gong === 12, `${after.gong} 宮`);

  /* 再展一次：確認鎖同解可以重複，唔會鎖死。 */
  await page.getByRole('button', { name: /再.*展.*一.*次/ }).click();
  await page.waitForTimeout(300);
  const again = await page.evaluate(() => getComputedStyle(document.body).overflow);
  check('再展一次又鎖得返', again === 'hidden', again);
  await page.waitForTimeout(ZHANJUAN_MS + 900);
  const released = await page.evaluate(() => getComputedStyle(document.body).overflow);
  check('再展完又解得返', released !== 'hidden', released);

  /*
   * ── 四、reduced-motion：即刻喺度，而且唔鎖 scroll ──
   *
   * 一個鎖住兩秒唔畀你 scroll 嘅「對等體驗」，唔係對等。
   */
  const still = await browser.newPage({
    viewport: { width: 1280, height: 1100 },
    reducedMotion: 'reduce',
  });
  await still.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await still.waitForTimeout(600);
  const quiet = await still.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    gong: document.querySelectorAll('.gong').length,
    zhan: Boolean(document.querySelector('.zhan')),
  }));
  check('reduced-motion 唔鎖 scroll', quiet.overflow !== 'hidden', quiet.overflow);
  check('reduced-motion 即刻出真盤', quiet.gong === 12, `${quiet.gong} 宮`);
  check('reduced-motion 冇骨架', !quiet.zhan, '仲有骨架');

  /* ── 五、400px 唔橫向滾 ─────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await phone.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(ZHANJUAN_MS + 900);
  const over = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check('400px', over <= 0, `橫向滾多咗 ${over}px`);
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 展卷驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 展卷：十二條界欄逐條畫（240ms · 相隔 90ms）、鎖 scroll 一次而且解得返、冇 spinner');
