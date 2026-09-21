/**
 * 註層驗收（工單 F1 · 內容系統 §4）
 *
 * 三條 AC：
 *   一句唔會有兩個未解釋術語　　　→ 純函數（`test/zhu.test.ts`）＋ 樣板上面個數
 *   撳過嘅術語同一本書唔再重複標點 → 呢度：掃成本書，數同一個詞標咗幾多次
 *   全部 noindex 無 OG　　　　　　→ `check-routes.mjs`
 *
 * 另外量兩樣睇得見先知嘅嘢：**註層係展開唔係浮窗**、撳完個點會退色。
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_JUAN_PORT ?? 3994);
const BASE = `http://localhost:${PORT}`;
const PATH = '/tokens/mingshu';
const fail = [];

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
  await page.waitForTimeout(900);

  /*
   * ── 一、目錄次序 ────────────────────────────────────
   *
   * `assembleAll()` 跟地支次序行，所以邊一宮排第一係睇你幾時出世。
   * 一本書嘅目錄要永遠一樣 —— 而且註層「全書只標一次」係跟章次序算，
   * 次序一亂，同一個人排兩次書，術語會標喺唔同嘅章度。
   */
  const mulu = await page.evaluate(() =>
    [...document.querySelectorAll('.shu-wrap li button')].map((b) => b.textContent.trim()),
  );
  check('目錄十二章', mulu.length === 12, `${mulu.length} 章`);
  check('第一章係命宮', mulu[0] === '命宮', `第一章係「${mulu[0]}」`);

  /*
   * ── 二、⚠ 一個術語全書只標一次 ─────────────────────
   *
   * 逐章撳入去數。同一個詞喺兩章都標到，就係重複標點。
   */
  const seen = new Map();
  for (let i = 0; i < mulu.length; i++) {
    await page.locator('.shu-wrap li button').nth(i).click();
    await page.waitForTimeout(220);
    const marks = await page.evaluate(() =>
      [...document.querySelectorAll('.zhu')].map((el) => el.textContent),
    );
    for (const m of marks) seen.set(m, (seen.get(m) ?? 0) + 1);
  }
  const twice = [...seen.entries()].filter(([, n]) => n > 1);
  check('冇一個術語標兩次', twice.length === 0, twice.map(([m, n]) => `${m}×${n}`).join('、'));
  check('真係有標嘢', seen.size > 5, `全書得 ${seen.size} 個術語`);

  /*
   * ── 三、⚠ 註層係展開，唔係浮窗 ─────────────────────
   *
   * 浮窗蓋住正文，讀完要撳走；展開係版面讓一讓位，讀完照住讀落去。
   * 所以量：佢喺正常文流入面（`position: static`）、冇 z-index、
   * 而且**唔會蓋住**下面嗰段（下面嗰段要被推低）。
   */
  await page.locator('.shu-wrap li button').first().click();
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('.shu-nei p')];
    return ps.length > 1 ? ps[ps.length - 1].getBoundingClientRect().top : null;
  });

  await page.locator('.zhu').first().click();
  await page.waitForTimeout(400);

  const note = await page.evaluate(() => {
    const el = document.querySelector('.zhu-ceng');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const ps = [...document.querySelectorAll('.shu-nei p')];
    return {
      position: cs.position,
      zIndex: cs.zIndex,
      link: el.querySelector('a')?.getAttribute('href') ?? null,
      lastTop: ps.length > 1 ? ps[ps.length - 1].getBoundingClientRect().top : null,
      text: el.textContent.length,
    };
  });
  check('撳咗有註層', Boolean(note), '冇展開');
  if (note) {
    check('註層喺文流入面', note.position === 'static', `position: ${note.position}`);
    check('註層冇 z-index', note.zIndex === 'auto', note.zIndex);
    check('註層有字', note.text > 40, `${note.text} 個字`);
    check('註層尾連去藏經閣', (note.link ?? '').includes('/lexicon/'), note.link ?? '冇連結');
    if (before !== null && note.lastTop !== null) {
      check('下面嗰段被推低，唔係被蓋住', note.lastTop > before, `${before} → ${note.lastTop}`);
    }
  }

  /* ── 四、撳過個點退色，但唔消失 ───────────────────── */
  const dot = await page.evaluate(() => {
    const el = document.querySelector('.zhu');
    const cs = getComputedStyle(el, '::after');
    return { seen: el.dataset.seen, width: cs.width, background: cs.backgroundColor };
  });
  check('撳過標記咗', dot.seen === '1', `data-seen=${dot.seen}`);
  check('個點冇消失', dot.width === '4px', dot.width);

  /* 再撳一次要收返 —— 一段註唔應該收唔埋。 */
  await page.locator('.zhu').first().click();
  await page.waitForTimeout(350);
  const closed = await page.evaluate(() => Boolean(document.querySelector('.zhu-ceng')));
  check('再撳收得返', !closed, '收唔埋');

  /* ── 五、400px 唔橫向滾 ─────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await phone.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(900);
  await phone.locator('.zhu').first().click();
  await phone.waitForTimeout(400);
  const over = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check('400px', over <= 0, `橫向滾多咗 ${over}px`);
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 註層驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 註層：目錄命宮行先、一個術語全書只標一次、註層係展開唔係浮窗、註尾連去藏經閣');
