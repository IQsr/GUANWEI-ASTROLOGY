/**
 * 落款五步驗收（工單 E4）
 *
 * 五條 AC 入面，四條要開瀏覽器先量得到：
 *
 *   已答嘅留喺上面淡到 20%　　→ 要 computed style
 *   唔知時辰有分支同安撫文案　→ 要撳一下個 checkbox
 *   時間欄嗰句夏令時（R-007）→ 要行到第三步先出現
 *   打字期間唔准重畫粒掣　　　→ 要真係打字，再比較個 DOM 節點
 *   冇確認頁，五步完直入題名　→ 要由頭行到尾
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_CAST_PORT ?? 3996);
const BASE = `http://localhost:${PORT}`;
const fail = [];

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

/** 行到第 n 步（由第一步開始填）。 */
async function fill(page, upto) {
  const btn = page.locator('button.btn-mo');
  if (upto >= 1) {
    await page.getByLabel('姓名').fill('李文卿');
    await btn.click();
  }
  if (upto >= 2) {
    await page.getByLabel('出生日期').fill('1998-03-12');
    await btn.click();
  }
  if (upto >= 3) {
    await page.getByLabel('出生時間').fill('07:40');
    await btn.click();
  }
  if (upto >= 4) {
    await page.getByLabel('出生地').selectOption('0');
    await btn.click();
  }
  await page.waitForTimeout(300);
}

let browser;
try {
  if (!(await waitUp())) {
    console.error('✗ server 起唔到');
    process.exit(1);
  }
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

  /*
   * ── 一、⚠ 打字期間唔准重畫粒掣 ──────────────────────
   *
   * 原型撞過：粒掣被條件 render，打字期間成個節點換咗，
   * 於是 mousedown 落喺舊節點、mouseup 落喺新節點 —— 撳落空。
   * 用戶唔會知發生咗乜，佢只會覺得個網壞咗。
   *
   * 所以量嘅唔係「粒掣有冇 disabled」，係**佢係咪同一個節點**。
   */
  await page.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  const handle = await page.$('button.btn-mo');
  check('粒掣', Boolean(handle), '第一步就搵唔到粒掣');
  await page.evaluate(() => {
    document.querySelector('button.btn-mo').dataset.mark = 'same-node';
  });
  await page.getByLabel('姓名').type('李文卿', { delay: 60 });
  await page.waitForTimeout(300);

  const stillSame = await page.evaluate(() => {
    const el = document.querySelector('button.btn-mo');
    return { connected: el?.isConnected ?? false, mark: el?.dataset.mark ?? null };
  });
  check('打字期間粒掣冇重畫', stillSame.mark === 'same-node', '粒掣換咗一個新節點');
  check('粒掣仲喺 DOM', stillSame.connected, '粒掣冇咗');
  const handleAlive = await handle.evaluate((el) => el.isConnected);
  check('原本嗰個節點仲喺度', handleAlive, '原本嗰粒掣被拆咗');

  /* ── 二、已答嘅留喺上面，淡到 20% ─────────────────── */
  await page.locator('button.btn-mo').click();
  await page.waitForTimeout(400);
  const answered = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.da')];
    return els.map((el) => ({ opacity: getComputedStyle(el).opacity, text: el.textContent }));
  });
  check('已答嘅留喺上面', answered.length === 1, `${answered.length} 行，應該 1`);
  if (answered[0]) {
    check('淡到 20%', answered[0].opacity === '0.2', `opacity ${answered[0].opacity}`);
    check('留低嘅係個名', answered[0].text.includes('李文卿'), answered[0].text);
  }

  /* ── 三、時間欄嗰句夏令時（rules.md R-007）───────── */
  await page.getByLabel('出生日期').fill('1998-03-12');
  await page.locator('button.btn-mo').click();
  await page.waitForTimeout(400);
  const timeText = await page.evaluate(() => document.body.innerText);
  check('R-007', timeText.includes('不用自己調夏令時'), '時間欄冇寫不用自己調夏令時');
  check('R-007', timeText.includes('出世紙'), '冇講清楚填邊個時間');

  /* ── 四、唔知時辰：有分支，有安撫文案 ─────────────── */
  const disabledBefore = await page.getByLabel('出生時間').isDisabled();
  check('時間欄', !disabledBefore, '未揀唔知時辰就已經 disabled');

  await page.getByRole('checkbox').check();
  await page.waitForTimeout(400);
  const branch = await page.evaluate(() => document.body.innerText);
  check('唔知時辰安撫文案', branch.includes('此書待時辰而成'), '冇「此書待時辰而成」');
  check('唔知時辰安撫文案', branch.includes('出世紙'), '冇教人去邊度搵');
  const disabledAfter = await page.getByLabel('出生時間').isDisabled();
  check('揀咗唔知時辰', disabledAfter, '時間欄冇 disable');
  const canGo = await page.locator('button.btn-mo').isEnabled();
  check('唔知時辰行得落', canGo, '揀咗唔知時辰之後粒掣仲係 disabled');

  /*
   * ── 五、⚠ 一步都唔可以跳（架構 §3）─────────────────
   *
   * 「唔可以 deep link 去『題名』—— 冇前面三幕鋪排，
   * 見到自己個名嗰下冇感覺。」
   */
  for (const step of ['sex', 'place', 'time', 'naming']) {
    const deep = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await deep.goto(`${BASE}/cast?step=${step}`, { waitUntil: 'domcontentloaded' });
    await deep.waitForTimeout(600);
    const label = await deep.evaluate(() => document.body.innerText);
    check(`?step=${step}`, label.includes('這本書要寫上誰的名字'), '冇落返第一步');
    const url = deep.url();
    check(`?step=${step} 個網址改返`, url.endsWith('step=name'), url);
    await deep.close();
  }

  /*
   * ── 六、冇確認頁，五步完直入排盤 ─────────────────
   *
   * 而且排盤要喺 server 行（架構 §9）—— 所以出返嚟嗰個盤
   * 帶住 engine_version 同 school_profile，client 冇得自己作。
   */
  const flow = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await flow.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await flow.waitForTimeout(600);
  await fill(flow, 4);
  await flow.getByRole('button', { name: '男', exact: true }).click();
  await flow.waitForTimeout(200);
  const lastLabel = await flow.locator('button.btn-mo').innerText();
  check('最後一步', lastLabel.replaceAll(/\s/g, '') === '成書', `粒掣寫住「${lastLabel}」`);

  await flow.locator('button.btn-mo').click();
  await flow.waitForTimeout(2500);
  const result = await flow.evaluate(() => document.body.innerText);
  /*
   * ⚠ 呢度本來斷言畫面上有「引擎 0.3.0」同流派指紋 —— E4 嗰陣個結果版
   * 印住佢哋。E5 將嗰一版換成題名幕，而題名幕係全站情感高點，
   * **唔應該喺嗰度印版本號**：嗰啲嘢屬於版權頁（H2 · R-008）。
   *
   * 所以呢度改成量「排盤真係喺 server 行過」嘅另一個憑據：
   * 題名幕出到個名（要有盤先入到嚟），而揭開之後有十二宮。
   * 「引擎唔喺 client」由 `check-bundle.mjs` 守。
   */
  check('五步完直入題名', result.includes('李文卿'), '冇入到題名幕');
  check('冇確認頁', !result.includes('確認'), '中間出咗一版確認頁');

  /*
   * ⚠ 唔准喺畫面上寫工單號。
   *
   * 工單號係我哋之間嘅講法，唔係讀者嘅。第一版寫住
   * 「題名那一幕是工單 E5」—— 一句「還沒有做好」講咗同一件事，
   * 而且唔會有人要去估 E5 係乜。
   */
  check('冇工單號', !/工單\s*[A-H]\d/.test(result), '畫面上出咗工單號');

  /* ── 七、400px 唔橫向滾 ─────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await phone.goto(`${BASE}/cast`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(700);
  for (let i = 0; i <= 3; i++) {
    const over = await phone.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`400px 第 ${i + 1} 步`, over <= 0, `橫向滾多咗 ${over}px`);
    await fill(phone, i === 0 ? 1 : 0);
    if (i === 0) continue;
    break;
  }
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 落款驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 落款：五步行得完、已答淡到 20%、打字期間粒掣冇重畫、一步都跳唔到、冇確認頁');
