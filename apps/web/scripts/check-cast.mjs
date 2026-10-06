/**
 * 落款驗收（工單 E4 · 2026-10-06 改做卷軸）
 *
 * 以前係五步，一步一步寫落書；而家五樣嘢一版過寫喺一幅卷軸上（`Juanzhou`）。
 * 要開瀏覽器先量得到嘅：
 *
 *   六行一版過見晒，未寫齊講明仲欠乜　→ 數行、睇印旁邊嗰句（2026-10-06 加咗「計時」：出生地／洛陽）
 *   打字期間唔准重畫個印（掣）　　　　→ 要真係打字，再比較個 DOM 節點
 *   時辰要等生辰同生地　　　　　　　　→ 未填之前選單 disabled；填咗出十三個時辰
 *   時間欄嗰句夏令時（R-007）　　　　　→ 要喺畫面上
 *   唔知時辰有分支同安撫文案　　　　　→ 揀「不知道時辰」
 *   生辰唔准寫一日唔存在嘅日子　　　　→ 一九九八年二月得廿八日
 *   舊連結 `?step=` 唔准變成入口　　　→ 落返成幅卷軸、清走 query
 *   冇確認頁：落印直入題名　　　　　　→ 要由頭行到尾
 *   400px 唔橫向滾
 */
import { acceptConsent, launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_CAST_PORT ?? 3996);
const BASE = `http://localhost:${PORT}`;
const fail = [];

const server = await startServer(PORT);

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

const SEAL = 'button.zhou-yin-an';

/** 寫生辰同生地（時辰嗰欄要佢哋先開）。 */
async function fillDatePlace(page) {
  await page.getByLabel('出生年份').fill('1998');
  await page.getByLabel('出生月份').selectOption('3');
  await page.getByLabel('出生日子').selectOption('12');
  await page.getByLabel('生地', { exact: true }).selectOption('0');
}

/** 等時辰選單出晒十三個時辰（`/api/slots` 返嚟）。 */
async function waitSlots(page) {
  await page
    .waitForFunction(() => document.querySelectorAll('.zhou-shi select option').length >= 15, null, { timeout: 10_000 })
    .catch(() => null);
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
  await acceptConsent(page);
  await page.waitForTimeout(700);

  /* ── 一、五樣一版過見晒；未寫齊，印旁邊講明仲欠乜 ────────── */
  const lines = await page.locator('.juanzhou .zhou-hang').count();
  check('一版過見晒', lines === 6, `${lines} 行，應該 6（姓名、生辰、生地、計時、時辰、性別）`);
  check('未寫齊印唔撳得', await page.locator(SEAL).isDisabled(), '乜都未寫，個印已經撳得');
  const owe = await page.locator('.zhou-qian').innerText();
  check('講明仲欠乜', ['生辰', '生地', '時辰', '性別'].every((w) => owe.includes(w)), `「${owe}」`);
  check('姓名唔係必填', !owe.includes('姓名'), `「${owe}」入面有姓名`);

  /*
   * ── 二、⚠ 打字期間唔准重畫個印 ─────────────────────
   *
   * 原型撞過：粒掣被條件 render，打字期間成個節點換咗，
   * 於是 mousedown 落喺舊節點、mouseup 落喺新節點 —— 撳落空。
   * 所以量嘅唔係「佢有冇 disabled」，係**佢係咪同一個節點**。
   */
  await page.evaluate((sel) => {
    document.querySelector(sel).dataset.mark = 'same-node';
  }, SEAL);
  await page.getByLabel('姓名').pressSequentially('李文卿', { delay: 60 });
  await page.waitForTimeout(300);
  const same = await page.evaluate((sel) => document.querySelector(sel)?.dataset.mark ?? null, SEAL);
  check('打字期間個印冇重畫', same === 'same-node', '個印換咗一個新節點');

  /* ── 三、時辰要等生辰同生地 ─────────────────────────── */
  const timeSel = page.getByLabel('時辰', { exact: true });
  check('未寫生辰生地，時辰唔開', await timeSel.isDisabled(), '時辰選單一開頭就撳得');

  /* 一九九八年二月得廿八日：日子選單唔准有廿九、三十 */
  await page.getByLabel('出生年份').fill('1998');
  await page.getByLabel('出生月份').selectOption('2');
  const febDays = await page.getByLabel('出生日子').locator('option').count();
  check('二月得廿八日', febDays === 29, `${febDays - 1} 日`);

  await fillDatePlace(page);
  await waitSlots(page);
  check('寫咗生辰生地，時辰開', await timeSel.isEnabled(), '時辰選單仲係 disabled');
  const options = await timeSel.locator('option').allInnerTexts();
  const slots = options.filter((o) => /時\s+\d{2}:\d{2}–\d{2}:\d{2}/.test(o));
  /* 2026-10-06 起晚子時屬當日（R-002）：香港一日十四格（前夜子時、早子時…亥時、夜子時）；前夜嗰格冇「X時 hh:mm」格式，所以呢度數到 13 */
  check('十三個時辰（連早晚子時）', slots.length === 13, `${slots.length} 個，應該 13（早子時、丑…亥、夜子時）`);
  check('時辰寫鐘面時間', slots.some((o) => /^未時\s+\d{2}:\d{2}–\d{2}:\d{2}$/.test(o.trim())), `「${slots[7] ?? ''}」`);
  check('有記得準確時間', options.includes('記得準確時間'), options.join('／'));
  check('有前夜子時（晚子時屬當日，R-002）', options.some((o) => o.startsWith('子時（前夜）')), options.join('／'));
  check('有不知道時辰', options.includes('不知道時辰'), options.join('／'));

  /* ── 三之二、計時（R-004）：預設出生地；揀洛陽，時辰選單跟住變 ─────── */
  const basisOn = await page.locator('.zhou-ji button[aria-pressed="true"]').innerText();
  check('計時預設出生地', basisOn.includes('出生地'), `揀咗「${basisOn}」`);

  /* ── 四、時間欄嗰句夏令時（rules.md R-007）───────────── */
  const text = await page.evaluate(() => document.body.innerText);
  check('R-007', text.includes('不用自己調夏令時'), '冇寫不用自己調夏令時');
  check('R-007', text.includes('出世紙'), '冇講清楚填邊個時間');

  /* 揀準確時間：出一格填時間，而且係空 —— 揀過時辰唔會扮成填咗時間 */
  await timeSel.selectOption({ label: options.find((o) => o.startsWith('未時')) ?? '' });
  await timeSel.selectOption('exact');
  await page.waitForTimeout(150);
  check('準確時間欄出現', (await page.getByLabel('出生時間').count()) === 1, '揀咗準確時間但冇欄');
  check('準確時間欄係空', (await page.getByLabel('出生時間').inputValue()) === '', '準確時間欄有字');

  /* ── 五、唔知時辰：有分支，有安撫文案 ─────────────────── */
  await timeSel.selectOption('none');
  await page.waitForTimeout(300);
  const branch = await page.evaluate(() => document.body.innerText);
  check('唔知時辰安撫文案', branch.includes('此書待時辰而成'), '冇「此書待時辰而成」');
  check('唔知時辰安撫文案', branch.includes('出世紙'), '冇教人去邊度搵');
  check('揀咗唔知時辰，時間欄收埋', (await page.getByLabel('出生時間').count()) === 0, '時間欄仲喺度');

  /* ── 六、⚠ 舊連結嘅 `?step=` 唔係入口（架構 §3）───────── */
  for (const step of ['sex', 'time', 'naming']) {
    const deep = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await deep.goto(`${BASE}/cast?step=${step}`, { waitUntil: 'domcontentloaded' });
    await acceptConsent(deep);
    await deep.waitForTimeout(600);
    check(`?step=${step}`, (await deep.locator('.juanzhou .zhou-hang').count()) === 6, '冇落返成幅卷軸');
    check(`?step=${step} 清走 query`, !deep.url().includes('step='), deep.url());
    check(`?step=${step} 冇入題名`, (await deep.locator('.mu-ti').count()) === 0, '入咗題名幕');
    await deep.close();
  }

  /*
   * ── 七、冇確認頁：落印直入題名 ─────────────────────
   *
   * 排盤要喺 server 行（架構 §9）：題名幕出到個名（要有盤先入到嚟）。
   * 「引擎唔喺 client」由 `check-bundle.mjs` 守。
   */
  const flow = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await flow.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await acceptConsent(flow);
  await flow.waitForTimeout(600);
  await flow.getByLabel('姓名').fill('李文卿');
  await fillDatePlace(flow);
  await waitSlots(flow);
  const flowTime = flow.getByLabel('時辰', { exact: true });
  const flowOptions = await flowTime.locator('option').allInnerTexts();
  await flowTime.selectOption({ label: flowOptions.find((o) => o.startsWith('辰時')) ?? '' });
  await flow.getByRole('button', { name: '男', exact: true }).click();
  await flow.waitForTimeout(200);
  check('寫齊咗印撳得', await flow.locator(SEAL).isEnabled(), '寫齊咗個印仲係 disabled');
  const ready = await flow.locator('.zhou-qian').innerText();
  check('寫齊咗唔再講欠', !ready.includes('尚欠'), `「${ready}」`);

  await flow.locator(SEAL).click();
  await flow.waitForSelector('.mu-ti', { timeout: 15_000 }).catch(() => null);
  const result = await flow.evaluate(() => document.body.innerText);
  check('落印直入題名', result.includes('李文卿'), '冇入到題名幕');
  check('冇確認頁', !result.includes('確認'), '中間出咗一版確認頁');
  /* 工單號係我哋之間嘅講法，唔係讀者嘅 */
  check('冇工單號', !/工單\s*[A-H]\d/.test(result), '畫面上出咗工單號');

  /* ── 八、400px 唔橫向滾（寫之前、寫咗之後）──────────── */
  const phone = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await phone.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await acceptConsent(phone);
  await phone.waitForTimeout(1800);
  const overflow = () =>
    phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const before = await overflow();
  check('400px 未寫', before <= 0, `橫向滾多咗 ${before}px`);
  await phone.getByLabel('姓名').fill('李文卿');
  await fillDatePlace(phone);
  await waitSlots(phone);
  const after = await overflow();
  check('400px 寫咗', after <= 0, `橫向滾多咗 ${after}px`);
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 落款驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 落款：六行一版過見晒（連計時）、欠乜講明、個印冇重畫、時辰等生辰生地、舊 ?step= 唔係入口、落印直入題名');
