/**
 * 未裁之頁驗收（工單 F4 · 架構 §6）
 *
 * 四條 AC，三條要開瀏覽器：
 *
 *   毛邊係一條撕痕　　　　　　→ 量 clip-path，唔係量「有冇一張圖」
 *   裂開動畫 1600ms　　　　　 → 量 animation-duration
 *   唔用 modal／模糊／倒數　　→ 掃成版（vitest 掃 source，呢度掃 render 咗嘅嘢）
 *   章名照樣列出，唔收埋　　　→ 未裁嗰版自己講得出佢有幾多格
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { launchBrowser, startServer, stopServer } from './_server.mjs';

const PORT = Number(process.env.CHECK_CAIJUAN_PORT ?? 3991);
const BASE = `http://localhost:${PORT}`;
const PATH = '/tokens/weicai';
const CUT_MS = 1600;
const fail = [];

const server = await startServer(PORT);

function check(name, cond, detail) {
  if (!cond) fail.push(`${name}：${detail}`);
}

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(`${BASE}${PATH}`)).status < 500) return true;
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  /*
   * ── 一、未裁嗰版 ──────────────────────────────────
   *
   * ⚠ 量嘅係「佢講唔講得出自己嘅形狀」。
   * 架構 §6：「未裁章喺目錄照樣列出章名，唔收埋。」
   * 一版乜都唔講嘅未裁頁，同「收埋咗」冇分別。
   */
  const uncut = await page.evaluate(() => {
    const zhi = document.querySelector('.weicai-zhi');
    return {
      there: Boolean(zhi),
      clip: zhi ? getComputedStyle(zhi).clipPath : '冇',
      ge: document.querySelectorAll('.weicai-ge li').length,
      text: document.body.innerText,
      images: document.querySelectorAll('.weicai img, .weicai svg').length,
    };
  });
  check('有一版未裁嘅紙', uncut.there, '搵唔到 .weicai-zhi');
  check('毛邊係 clip-path 唔係圖', uncut.clip.startsWith('polygon'), uncut.clip.slice(0, 40));
  check('零張圖片（視覺 §6）', uncut.images === 0, `${uncut.images} 張`);
  check('講得出自己有幾多格', uncut.ge >= 3, `${uncut.ge} 格`);
  check('寫住未裁開', uncut.text.includes('還沒有裁開'), '冇講');

  /* ⚠ 「裁開」係動作嘅名 —— 唔係「升級」「解鎖」「立即購買」。 */
  for (const w of ['升級', '解鎖', '立即購買', '限時', '優惠']) {
    check('唔用推銷字眼', !uncut.text.includes(w), `出現咗「${w}」`);
  }

  /*
   * ⚠ 2026-11-10（Issac 拍板，推翻「冇模糊偷睇」）：未裁章先俾結論段，下面糊住**假字**。
   * 新規矩：糊住嘅只准係 `.weicai-mo` 嗰格假字（messages weicai.filler1–3），結論段本身唔糊，亦唔准糊住正文。
   */
  const blur = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.weicai *')].filter((el) => (getComputedStyle(el).filter || '').includes('blur'));
    const lead = document.querySelector('.weicai-lead > p:nth-of-type(2)');
    return {
      n: els.length,
      onlyMo: els.every((el) => el.classList.contains('weicai-mo')),
      leadClear: lead ? !(getComputedStyle(lead).filter || '').includes('blur') && !lead.closest('.weicai-mo') : true,
      hidden: els.every((el) => el.getAttribute('aria-hidden') === 'true'),
    };
  });
  check('糊住嘅只係 .weicai-mo 假字', blur.onlyMo, `${blur.n} 個元素糊咗，唔係全部喺 .weicai-mo`);
  check('結論段唔糊', blur.leadClear, '結論段糊咗');
  check('糊住嗰格讀屏器唔讀', blur.hidden, '冇 aria-hidden');

  /* ── 二、裂開 1600ms，一次 ────────────────────────── */
  await page.locator('[data-demo="cut"]').click();
  await page.waitForTimeout(200);
  const cutting = await page.evaluate(() => {
    const zhi = document.querySelector('.caikai-zhi');
    if (!zhi) return null;
    const cs = getComputedStyle(zhi);
    return {
      dur: cs.animationDuration,
      count: cs.animationIterationCount,
      fill: cs.animationFillMode,
      /* ⚠ 正文由第一幀起就喺 DOM 度，淨係畀一張紙蓋住。 */
      words: document.querySelector('.caikai')?.innerText.length ?? 0,
    };
  });
  check('裂開緊', cutting !== null, '搵唔到 .caikai-zhi');
  check('1600ms', cutting?.dur === `${CUT_MS / 1000}s`, cutting?.dur ?? '冇');
  check('播一次', cutting?.count === '1', cutting?.count ?? '冇');
  check('播完停喺尾', cutting?.fill === 'forwards', cutting?.fill ?? '冇');
  check('正文一開始就喺 DOM 度', (cutting?.words ?? 0) > 50, `${cutting?.words} 字`);

  await page.waitForTimeout(CUT_MS + 400);
  const after = await page.evaluate(() => ({
    zhi: Boolean(document.querySelector('.caikai-zhi')),
    cutting: document.querySelector('.caikai')?.dataset.cutting,
  }));
  check('播完就收返張紙', !after.zhi, '張紙仲喺度');
  check('播完個狀態轉咗', after.cutting === '0', after.cutting ?? '冇');

  /* ── 三、⚠ 冇 modal ───────────────────────────────── */
  const modal = await page.evaluate(
    () => document.querySelectorAll('dialog, [role="dialog"], [aria-modal="true"]').length,
  );
  check('冇 modal', modal === 0, `${modal} 個`);

  /* ── 四、reduced-motion 一裁就裁咗 ──────────────────
   *
   * ⚠ 唔係「快啲裂」。一個唔想睇動畫嘅人，唔應該等 1.6 秒
   * 先睇到自己畀咗錢嘅字。
   */
  const still = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  await still.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await still.waitForTimeout(600);
  await still.locator('[data-demo="cut"]').click();
  await still.waitForTimeout(150);
  const quiet = await still.evaluate(() => {
    const zhi = document.querySelector('.caikai-zhi');
    return {
      display: zhi ? getComputedStyle(zhi).display : '冇張紙',
      words: document.querySelector('.caikai')?.innerText.length ?? 0,
    };
  });
  check('reduced-motion 即刻見到字', quiet.words > 50, `${quiet.words} 字`);
  check(
    'reduced-motion 冇張紙蓋住',
    quiet.display === 'none' || quiet.display === '冇張紙',
    quiet.display,
  );

  /* ── 五、400px 唔橫向滾 ──────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await phone.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(500);
  const over = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check('400px 唔橫向滾', over <= 0, `多咗 ${over}px`);
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 未裁之頁驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 未裁：毛邊係撕痕唔係圖、裂開 1600ms 播一次、冇 modal 冇模糊冇推銷字、正文一開始就喺度');
