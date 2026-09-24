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
  /*
   * ── 隨讀：右側細命盤跟捲動高亮（工單 F2）────────────
   *
   * ⚠ 量嘅唔係「有個盤」，係「捲到唔同段落佢真係唔同」。
   * 一個由頭到尾都亮住同一格嘅盤，滿足唔到「跟捲動」三個字 ——
   * 佢淨係做咗一個標籤。
   */
  const wide = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await wide.goto(`${BASE}/tokens/suidu`, { waitUntil: 'domcontentloaded' });
  await wide.waitForTimeout(900);

  const atSlot = async (slot) => {
    await wide.evaluate((s) => {
      const el = [...document.querySelectorAll('.suidu [data-slot]')].find(
        (e) => e.dataset.slot === s,
      );
      if (el) window.scrollBy(0, el.getBoundingClientRect().top - window.innerHeight / 3);
    }, slot);
    await wide.waitForTimeout(700);
    return wide.evaluate(() => ({
      /* ⚠ 連「而家跟緊邊一格」一齊攞 —— 捲唔到位嘅話要睇得出係捲唔到，
         唔係個規則錯。 */
      at: document.querySelector('.suidu-pan')?.dataset.at ?? '',
      self: document.querySelectorAll('.suidu-pan .gong[data-lit="self"]').length,
      san: document.querySelectorAll('.suidu-pan .gong[data-lit="san"]').length,
    }));
  };

  const panes = await wide.evaluate(() => ({
    url: location.href,
    pane: document.querySelector('.suidu-pan')
      ? getComputedStyle(document.querySelector('.suidu-pan')).display
      : '冇 .suidu-pan',
    gong: document.querySelectorAll('.suidu-pan .gong').length,
    clickable: [...document.querySelectorAll('.suidu-pan .gong')].filter((g) => !g.disabled).length,
  }));
  check('夠闊就出個細盤', panes.pane !== 'none' && panes.pane !== '冇 .suidu-pan', `${panes.pane} @ ${panes.url}`);
  check('細盤都係十二宮', panes.gong === 12, `${panes.gong} 宮`);
  /* 佢跟住字行 —— 一個撳得嘅盤會令讀者以為佢揀咗嘅嘢會留低。 */
  check('細盤撳唔郁', panes.clickable === 0, `${panes.clickable} 格撳得`);

  /*
   * ⚠ 個盤要真係黐住 —— 唔係「有個盤喺 DOM 度」。
   *
   * 第一版寫 `top: var(--sp-5)`，而呢個 app 根本冇 `--sp-*` 變數
   * （嗰七個節奏值住喺 Tailwind 嘅 spacing scale）。變數唔存在，
   * `top` 就係 auto，sticky 等於冇 —— 個盤跟住捲走。
   *
   * 而上面幾條 check **全部照樣綠**：佢哋量嘅係邊幾格亮，
   * 而一個捲走咗嘅盤一樣亮得啱。量錯咗嘢嘅 check 唔會救你。
   */
  await wide.evaluate(() => window.scrollBy(0, 600));
  await wide.waitForTimeout(500);
  const stuck = await wide.evaluate(() => {
    const el = document.querySelector('.suidu-ding');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check('個盤黐住唔會捲走', stuck !== null && stuck >= 0 && stuck <= 80, `頂部喺 ${stuck}px`);

  const kai = await atSlot('開場');
  check('捲到開場', kai.at === '開場', `跟緊「${kai.at}」`);
  check('開場亮本宮', kai.self === 1 && kai.san === 0, JSON.stringify(kai));

  const qian = await atSlot('牽動');
  check('捲到牽動', qian.at === '牽動', `跟緊「${qian.at}」`);
  check('牽動連三方四正一齊亮', qian.self === 1 && qian.san === 3, JSON.stringify(qian));

  /* ⚠ 過場係一道橋，唔換題目 —— 佢唔可以熄個盤（視覺 §2 靜）。 */
  const guo = await atSlot('過場');
  check('過場唔熄個盤', guo.self === 1, JSON.stringify(guo));

  /*
   * ⚠ 留白句係「交返畀讀者」嗰一句（內容 §5）。
   * 喺嗰一刻仲亮住一格盤，就係喺一句「留返畀你自己驗證」下面
   * 繼續指住個盤 —— 講埋唔應該講嘅嘢。
   *
   * ⚠ 捲得到呢一格，本身就係一條驗收：冇章尾嗰段留白嘅話，
   * 一章嘅最後三分二永遠捲唔到讀線度。
   */
  const liu = await atSlot('留白');
  check('捲到留白', liu.at === '留白', `跟緊「${liu.at}」`);
  check('留白乜都唔亮', liu.self === 0 && liu.san === 0, JSON.stringify(liu));

  /* 手機唔出個盤 —— 400px 唔可以橫向滾（E2 同一條規矩）。 */
  const narrow = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await narrow.goto(`${BASE}/tokens/suidu`, { waitUntil: 'domcontentloaded' });
  await narrow.waitForTimeout(600);
  const small = await narrow.evaluate(() => {
    const el = document.querySelector('.suidu-pan');
    return {
      display: el ? getComputedStyle(el).display : '冇',
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check('手機唔出個細盤', small.display === 'none', small.display);
  check('隨讀喺 400px 唔橫向滾', small.over <= 0, `多咗 ${small.over}px`);

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
console.log(
  '✓ 註層：目錄命宮行先、一個術語全書只標一次、註層係展開唔係浮窗、註尾連去藏經閣、細盤跟捲動亮',
);
