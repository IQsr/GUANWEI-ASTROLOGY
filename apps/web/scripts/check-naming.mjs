/**
 * 合書題名驗收（工單 E5 · 視覺系統 §9）
 *
 * 全站情感高點。五條 AC 入面四條要開瀏覽器：
 *
 *   墨滲 1600 → 停 1.2 秒 → 朱砂落印　→ 量 animation-duration / delay
 *   呢一幕冇任何掣　　　　　　　　　　→ 數行緊嗰陣有幾多個互動元素
 *   唔自動翻開，一定要用戶自己撳　　　→ 等完成幕再睇本書開咗未
 *   呢一幕之前冇出現過任何價錢　　　　→ 掃成條流程嘅字
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_NAMING_PORT ?? 3995);
const BASE = `http://localhost:${PORT}`;
const fail = [];

/* 同 `src/lib/timing.ts` 對返 —— 嗰度改咗呢度就要爆。 */
const INK_MS = 1600;
const STILL_MS = 1200;
const SEAL_MS = 520;
const SEAL_DELAY_MS = INK_MS + STILL_MS;
const NAMING_MS = SEAL_DELAY_MS + SEAL_MS;

const server = startServer(PORT);

function check(name, cond, detail) {
  if (!cond) fail.push(`${name}：${detail}`);
}

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(`${BASE}/cast`)).status === 200) return true;
    } catch {
      /* 未起身 */
    }
    await sleep(500);
  }
  return false;
}

/** 由第一步行到題名幕。 */
async function toNaming(page) {
  const btn = page.locator('button.btn-mo');
  await page.getByLabel('姓名').fill('李文卿');
  await btn.click();
  await page.getByLabel('出生日期').fill('1998-03-12');
  await btn.click();
  await page.getByLabel('出生時間').fill('07:40');
  await btn.click();
  await page.getByLabel('出生地').selectOption('0');
  await btn.click();
  await page.getByRole('button', { name: '男', exact: true }).click();
  await page.waitForTimeout(150);
  await btn.click();
  /* 等排盤返嚟，但**唔好等成幕行完** —— 下面要量行緊嗰陣。 */
  await page.waitForSelector('.mu-ti', { timeout: 15_000 });
}

let browser;
try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  /*
   * ── 一、⚠ 呢一幕冇任何掣 ────────────────────────────
   *
   * 行緊嗰陣一個互動元素都唔應該有：冇掣、冇連結、冇輸入欄。
   * 「用戶淨係睇」係字面意思。
   */
  /*
   * ── 零、⚠ 本書要企喺版心中間 ──────────────────────
   *
   * 影咗相先見到：呢一幕本來冇版位可言 —— `.mu-ti` 一條 CSS 都冇，
   * 本書跟住 `<main>` 嘅左上角企，右邊同下面加埋差唔多六成係空。
   *
   * 「留白係內容」（視覺 §5）同「冇擺過位」唔同：
   * 前者係度出嚟嘅，後者係跌咗落嗰度。
   *
   * ⚠ 量嘅係**個盒嘅中心**，唔係書脊。
   * 第一版量書脊（合埋嗰陣書脊企喺盒最左，所以要將個盒推右），
   * 三個數字啱晒，但出嚟嘅畫面係一本書貼住正中向右長、左邊成半版吉。
   * 量啱咗一樣唔應該量嘅嘢。
   */
  const bookCentre = async () =>
    page.evaluate(() => {
      const el = document.querySelector('.shu');
      const stage = document.querySelector('.mu-wei');
      if (!el || !stage) return null;
      const b = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return Math.round(b.left + b.width / 2 - (s.left + s.width / 2));
    });

  /*
   * ⚠ 先確認 CSS 真係落咗。
   *
   * 呢條 check 第一次綠嗰次，個頁其實**一條 CSS 都冇落**（server 手多多
   * 重啟咗，serve 緊舊 build，個 stylesheet 404）。冇 CSS 之下
   * `.shu` 同 `.mu-wei` 都係 block、都係成版闊，兩個中心自然重疊 ——
   * 「偏咗 0px」，綠。
   *
   * **一條喺乜都冇嘅情況下都會綠嘅 check，量緊嘅係零。**
   * 所以量位之前，先量佢有冇排過版。
   */
  const laid = await page.evaluate(() => {
    const stage = document.querySelector('.mu-wei');
    const book = document.querySelector('.shu');
    if (!stage || !book) return null;
    return {
      display: getComputedStyle(stage).display,
      bookW: Math.round(book.getBoundingClientRect().width),
      stageW: Math.round(stage.getBoundingClientRect().width),
    };
  });
  check('版位真係排過', laid?.display === 'flex', laid?.display ?? '搵唔到 .mu-wei');
  check(
    '本書唔係成版闊（即係 CSS 落咗）',
    laid !== null && laid.bookW > 0 && laid.bookW < laid.stageW - 40,
    `本書 ${laid?.bookW}px／版心 ${laid?.stageW}px`,
  );

  const offLuokuan = await bookCentre();
  check('落款嗰陣本書企中間', offLuokuan !== null && Math.abs(offLuokuan) <= 2, `偏咗 ${offLuokuan}px`);

  await toNaming(page);
  const offNaming = await bookCentre();
  check('題名嗰陣本書企中間', offNaming !== null && Math.abs(offNaming) <= 2, `偏咗 ${offNaming}px`);

  /*
   * ── 零之二、⚠ 左頁真係有序 ────────────────────────
   *
   * 題名幕左頁嗰兩行，以前係喺 component 度手寫嘅 stand-in ——
   * 同 `free.ts` 嗰個真序講唔同嘅嘢，讀者喺封面見到一句，
   * 揭開之後讀到另一句。而家由 server 帶過嚟。
   *
   * ⚠ 所以呢度要量嘅唔係「寫成點」，係「到唔到」：
   * 條線一斷（preface 係 null），左頁就會一片白，
   * 而一片白係唔會有人 report 嘅 bug。
   */
  const verso = await page.evaluate(() => {
    const el = document.querySelector('.shu-verso');
    const ps = el ? [...el.querySelectorAll('p')].map((p) => p.textContent?.trim() ?? '') : [];
    return { title: ps[0] ?? '', lead: ps[1] ?? '' };
  });
  check('左頁有章名', verso.title.includes('序'), `「${verso.title}」`);
  check(
    '左頁有章首（30–60 字）',
    verso.lead.length >= 30 && verso.lead.length <= 60,
    `${verso.lead.length} 字：「${verso.lead.slice(0, 20)}…」`,
  );

  const during = await page.evaluate(() => {
    /*
     * ⚠ 量成版，唔係量本書嗰忽。
     *
     * 第一版淨係數 `.mu-ti` 入面 —— 綠嘅，但個返回連結同夜讀掣
     * 就企喺個名上面兩吋。一幕情感高點，上面掛住兩件工具，
     * 就唔再係一幕。AC 寫「呢一幕冇任何掣」，唔係「本書上面冇掣」。
     */
    const scene = document.body;
    return {
      /* `inert` 入面嘅唔算 —— 但下面嗰條 AC 係「冇任何掣」，
         所以兩個數都量：總數同真係撳得嘅。 */
      interactive: scene.querySelectorAll('button, a, input, select, textarea, [tabindex]').length,
      live: [...scene.querySelectorAll('button, a, input, select, textarea')].filter(
        (el) => !el.closest('[inert]'),
      ).length,
      shape: scene.querySelector('.shu')?.dataset.shape,
    };
  });
  check('行緊嗰陣冇任何掣', during.interactive === 0, `有 ${during.interactive} 個互動元素`);
  check('連撳得嗰啲都冇', during.live === 0, `有 ${during.live} 個撳得嘅元素`);
  check('書係合埋嘅', during.shape === 'closed', during.shape ?? '冇書');

  /*
   * ── 二、墨滲 1600 → 停 1.2 秒 → 落印 ────────────────
   *
   * 量 computed style，唔係「睇落差唔多」。
   * 中間嗰 1.2 秒係成幕最重要嗰部分：乜都唔郁。
   */
  const timing = await page.evaluate(() => {
    const ink = getComputedStyle(document.querySelector('.mu-ti .moshen'));
    const seal = getComputedStyle(document.querySelector('.mu-ti .yin-luo'));
    return {
      inkDur: ink.animationDuration,
      inkDelay: ink.animationDelay,
      sealDur: seal.animationDuration,
      sealDelay: seal.animationDelay,
    };
  });
  check('墨滲 1600ms', timing.inkDur === `${INK_MS / 1000}s`, timing.inkDur);
  check('墨滲即刻開始', timing.inkDelay === '0s', timing.inkDelay);
  check('落印 520ms', timing.sealDur === `${SEAL_MS / 1000}s`, timing.sealDur);
  check(
    `停 ${STILL_MS / 1000} 秒（落印喺 ${SEAL_DELAY_MS}ms）`,
    timing.sealDelay === `${SEAL_DELAY_MS / 1000}s`,
    timing.sealDelay,
  );

  /*
   * ── 三、⚠ 唔自動翻開 ──────────────────────────────
   *
   * 等成幕行完，再等多兩秒。本書要**仲係合埋**。
   * 一本自己揭開嘅書，就唔係你揭開嘅。
   */
  await page.waitForTimeout(NAMING_MS + 2000);
  const after = await page.evaluate(() => {
    const scene = document.body;
    const kai = scene.querySelector('.mu-ti-kai');
    const cs = kai ? getComputedStyle(kai) : null;
    return {
      shape: scene.querySelector('.shu')?.dataset.shape,
      interactive: scene.querySelectorAll('button, a, input, select, textarea').length,
      kai: Boolean(kai),
      text: kai?.textContent ?? '',
      border: cs?.borderTopWidth ?? null,
      background: cs?.backgroundColor ?? null,
    };
  });
  check('冇自動翻開', after.shape === 'closed', `而家係 ${after.shape}`);
  check('行完之後啱啱好一個撳得嘅嘢', after.interactive === 1, `${after.interactive} 個`);
  check('嗰個嘢係本書，唔係一粒掣', after.kai, '搵唔到熱區');
  check('熱區冇字', after.text === '', `寫住「${after.text}」`);
  check('熱區冇邊框', after.border === '0px', after.border ?? '冇');
  check(
    '熱區冇底色',
    after.background === 'rgba(0, 0, 0, 0)' || after.background === 'transparent',
    after.background ?? '冇',
  );

  /*
   * ── 四、撳咗先揭開 ────────────────────────────────
   *
   * ⚠ 撳之前要睇熱區仲喺唔喺。
   *
   * 第一次變異測試（畀佢自動翻開）嗰陣，呢一行等咗三十秒然後掟咗個
   * stack trace 出嚟 —— 上面幾條 check 明明已經捉到咗，但份報告冇出過。
   * **一個一撞到就 crash 嘅驗收腳本，報唔到佢捉到乜。**
   */
  if (after.kai) {
    await page.locator('.mu-ti-kai').click({ timeout: 5000 });
    /*
     * ⚠ 揭開之後仲有一幕：展卷（E6）——
     * 界欄逐條畫出（1230ms）＋ 星落位，成幕 2130ms，之後先出真盤。
     * 呢個等候時間唔係「畀佢 render 一陣」，係一段寫定咗嘅序列。
     */
    await page.waitForTimeout(2800);
  }
  const opened = await page.evaluate(() => ({
    shape: document.querySelector('.shu')?.dataset.shape,
    gong: document.querySelectorAll('.gong').length,
    kai: Boolean(document.querySelector('.mu-ti-kai')),
    /* 揭開之後兩件工具要返嚟 —— 嗰陣已經係喺度讀緊。 */
    chrome: document.querySelectorAll('header a, header button').length,
  }));
  const offZhan = after.kai ? await bookCentre() : null;
  if (after.kai) {
    check('展卷嗰陣本書企中間', offZhan !== null && Math.abs(offZhan) <= 2, `偏咗 ${offZhan}px`);
    check('撳咗就揭開', opened.shape === 'opened', opened.shape ?? '冇書');
    check('入面係盤', opened.gong === 12, `${opened.gong} 宮`);
    check('揭開咗之後冇咗熱區', !opened.kai, '熱區仲喺度');
    check('揭開咗之後兩件工具返嚟', opened.chrome === 2, `${opened.chrome} 件`);
  }

  /*
   * ── 四之二、⚠ 成書寫唔到就唔好扮有（工單 G5）───────
   *
   * 呢個 build 冇 Supabase 環境變數，所以 `keepBook()` 一定回 null ——
   * 即係話呢一版**應該連一條去 `/book/…` 嘅路都冇**。
   *
   * 呢條 check 守住嘅係一個好容易犯嘅錯：為咗「流程順啲」，
   * 喺本書未寫入之前就畫定個入口。噉樣做出嚟係一條死連結，
   * 或者更差 —— 一句「已收入書齋」，而書齋入面乜都冇。
   *
   * 架構 §8：唔好扮有。
   */
  const pretend = await page.evaluate(() => ({
    links: [...document.querySelectorAll('a')]
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.includes('/book/')),
    text: document.body.innerText,
  }));
  check('冇 DB 就冇命書入口', pretend.links.length === 0, pretend.links.join('、'));
  for (const w of ['收入書齋', '已收入', '已儲存', '已入藏'])
    check('冇 DB 就唔准話收咗', !pretend.text.includes(w), `出現咗「${w}」`);

  /*
   * ── 五、⚠ 呢一幕之前冇出現過任何價錢 ───────────────
   *
   * 架構 §6 硬規則。掃嘅係成條流程行落嚟見過嘅字。
   */
  const words = ['價', '元', '£', '$', '升級', '訂閱', '付款', '收費', '免費'];
  const seen = await page.evaluate(() => document.body.innerText);
  for (const w of words) check('題名幕冇價錢', !seen.includes(w), `出現咗「${w}」`);

  /*
   * ── 六、reduced-motion 係對等體驗（視覺 §7 第六條）──
   *
   * 唔係「快咗嘅版本」：三樣嘢即刻齊齊整整咁喺度，而且即刻撳得。
   */
  const still = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: 'reduce',
  });
  await still.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await still.waitForTimeout(600);
  await toNaming(still);
  await still.waitForTimeout(400);
  const quiet = await still.evaluate(() => {
    const scene = document.body;
    const ink = getComputedStyle(scene.querySelector('.moshen'));
    const seal = getComputedStyle(scene.querySelector('.yin-luo'));
    return {
      inkName: ink.animationName,
      inkOpacity: ink.opacity,
      sealName: seal.animationName,
      sealOpacity: seal.opacity,
      kai: Boolean(scene.querySelector('.mu-ti-kai')),
    };
  });
  check('reduced-motion 冇動畫', quiet.inkName === 'none', quiet.inkName);
  check('reduced-motion 冇動畫（印）', quiet.sealName === 'none', quiet.sealName);
  check('reduced-motion 個名見得到', quiet.inkOpacity === '1', quiet.inkOpacity);
  check('reduced-motion 個印見得到', quiet.sealOpacity === '1', quiet.sealOpacity);
  check('reduced-motion 即刻撳得', quiet.kai, '要等');
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 題名驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log(
  '✓ 題名：1600 → 停 1.2 秒 → 落印、行緊冇任何掣、唔自動翻開、撳本書先揭開、寫唔入就唔扮有、三個狀態都企喺版心中間、左頁係真嗰個序',
);
