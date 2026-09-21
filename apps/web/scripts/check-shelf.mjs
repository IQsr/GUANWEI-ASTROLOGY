/**
 * 書架驗收（工單 E3）
 *
 * 四條 AC 入面有三條要開瀏覽器先量得到：
 *
 *   零木紋、零陰影、零透視　　→ 要 computed style
 *   hover 升 10px　　　　　　 → 要真係 hover 一下
 *   取書之後書櫃淡到 16% 但唔消失 → 要撳一下再量
 *
 * 第二條（次序、朱砂、空狀態）係純函數，喺 `test/shelf.test.ts`。
 */
import { launchBrowser, startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_SHELF_PORT ?? 3997);
const BASE = `http://localhost:${PORT}`;
const PATH = '/tokens/shelf';
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  /*
   * ── 一、成個書櫃得五條線 ────────────────────────────
   *
   * 頂板、兩塊層板（三個 `.jia-ban`）＋ 兩塊立板（`::before` / `::after`）。
   * 逐條量佢係咪真係 1px —— 一條 2px 嘅「線」就唔再係一條界欄。
   */
  const lines = await page.evaluate(() => {
    const jia = document.querySelector('.jia');
    const bans = [...document.querySelectorAll('.jia-ban')].map(
      (el) => getComputedStyle(el).height,
    );
    const uprights = ['::before', '::after'].map((p) => getComputedStyle(jia, p).width);
    return { bans, uprights };
  });
  check('書櫃', lines.bans.length === 3, `${lines.bans.length} 塊層板／頂板，應該 3`);
  for (const h of lines.bans) check('層板', h === '1px', `厚 ${h}`);
  for (const w of lines.uprights) check('立板', w === '1px', `闊 ${w}`);

  /*
   * ── 二、零木紋、零陰影、零透視 ─────────────────────
   *
   * 視覺 §10 將木紋貼圖同圓角投影列咗入「避」。
   * 呢三樣唔係「盡量唔用」，係一樣都冇 —— 所以量嘅係 `none`。
   */
  const materials = await page.evaluate(() => {
    const els = ['.jia', '.jia-ban', '.ji'].flatMap((sel) => [
      ...document.querySelectorAll(sel),
    ]);
    const jia = document.querySelector('.jia');
    const rows = els.map((el) => {
      const cs = getComputedStyle(el);
      return {
        sel: el.className,
        shadow: cs.boxShadow,
        image: cs.backgroundImage,
        perspective: cs.perspective,
        radius: cs.borderTopLeftRadius,
        filter: cs.filter,
      };
    });
    for (const p of ['::before', '::after']) {
      const cs = getComputedStyle(jia, p);
      rows.push({
        sel: `.jia${p}`,
        shadow: cs.boxShadow,
        image: cs.backgroundImage,
        perspective: cs.perspective,
        radius: cs.borderTopLeftRadius,
        filter: cs.filter,
      });
    }
    return rows;
  });
  for (const r of materials) {
    check(`${r.sel} 零陰影`, r.shadow === 'none', r.shadow);
    check(`${r.sel} 零木紋`, r.image === 'none', r.image);
    check(`${r.sel} 零透視`, r.perspective === 'none', r.perspective);
    check(`${r.sel} 零圓角`, r.radius === '0px', r.radius);
    check(`${r.sel} 零濾鏡`, r.filter === 'none', r.filter);
  }

  /*
   * ── 三、hover 升 10px ───────────────────────────────
   *
   * 視覺 §7 第二條：只准 translateY ≤ 16px，唔准 scale / rotate / 3D。
   * 所以唔係淨係量「郁咗」—— 要量個 matrix 除咗位移之外乜都冇。
   */
  const before = await page.evaluate(
    () => getComputedStyle(document.querySelectorAll('.ji')[1]).transform,
  );
  check('hover 之前', before === 'none', before);

  await page.locator('.ji').nth(1).hover();
  await page.waitForTimeout(500);
  const after = await page.evaluate(
    () => getComputedStyle(document.querySelectorAll('.ji')[1]).transform,
  );
  const m = after.match(/^matrix\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+)\)$/);
  check('hover transform', Boolean(m), after);
  if (m) {
    const [a, b, c, d, e, f] = m.slice(1).map(Number);
    check('hover 冇縮放冇旋轉', a === 1 && b === 0 && c === 0 && d === 1, after);
    check('hover 冇左右郁', e === 0, `translateX ${e}`);
    check('hover 升 10px', f === -10, `translateY ${f}`);
  }

  /*
   * ── 四、取書之後書櫃淡到 16%，但唔消失 ──────────────
   *
   * 「唔消失」係呢條 AC 嘅重點：消失咗就變咗跳去另一版。
   * 所以除咗量 opacity，仲要量佢仲喺度（`display` 唔係 none、有闊度）。
   */
  await page.mouse.move(0, 0);
  await page.locator('.ji').first().click();
  await page.waitForTimeout(900);

  const dim = await page.evaluate(() => {
    const jia = document.querySelector('.jia');
    const ban = document.querySelector('.jia-ban');
    const cs = getComputedStyle(ban);
    const before = getComputedStyle(jia, '::before');
    return {
      banOpacity: cs.opacity,
      banDisplay: cs.display,
      banWidth: ban.getBoundingClientRect().width,
      uprightOpacity: before.opacity,
      uprightWidth: before.width,
      cover: Boolean(document.querySelector('.ji-kong .shu')),
      coverShape: document.querySelector('.ji-kong .shu')?.dataset.shape,
    };
  });
  check('書櫃淡到 16%', dim.banOpacity === '0.16', `opacity ${dim.banOpacity}`);
  check('立板一樣淡到 16%', dim.uprightOpacity === '0.16', `opacity ${dim.uprightOpacity}`);
  check('書櫃冇消失', dim.banDisplay !== 'none' && dim.banWidth > 100, `${dim.banDisplay} ${dim.banWidth}px`);
  check('立板冇消失', dim.uprightWidth === '1px', dim.uprightWidth);
  check('取咗嗰本變咗封面', dim.cover && dim.coverShape === 'closed', dim.coverShape ?? '冇書');

  /* ── 五、空狀態 = 得一條虛線書脊 ─────────────────── */
  await page.getByRole('button', { name: '空', exact: true }).click();
  await page.waitForTimeout(600);
  const empty = await page.evaluate(() => {
    const jis = [...document.querySelectorAll('.ji')];
    return {
      count: jis.length,
      kind: jis[0]?.dataset.kind,
      style: jis[0] ? getComputedStyle(jis[0]).borderTopStyle : null,
    };
  });
  check('空狀態', empty.count === 1, `${empty.count} 條書脊，應該 1`);
  check('空狀態係「＋ 新書」', empty.kind === 'new', empty.kind ?? '冇');
  check('空狀態係虛線', empty.style === 'dashed', empty.style ?? '冇');

  /* ── 六、400px 唔橫向滾 ─────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await phone.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(800);
  for (const label of ['空', '一本', '四本']) {
    await phone.getByRole('button', { name: label, exact: true }).click();
    await phone.waitForTimeout(400);
    const over = await phone.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`400px ${label}`, over <= 0, `橫向滾多咗 ${over}px`);
  }
} finally {
  if (browser) await browser.close();
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 書架驗收唔過：');
  for (const f of fail) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 書架：五條線、零木紋零陰影零透視、hover 升 10px、取書淡到 16% 但冇消失');
