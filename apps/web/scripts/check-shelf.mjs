/**
 * 書架驗收（工單 E3）
 *
 * 四條 AC 入面有三條要開瀏覽器先量得到：
 *
 *   個櫃係書房嗰張相、書企喺層板上 → 要量位置（2026-10-15 改版；舊版係「零木紋零陰影」）
 *   零透視、零圓角　　　　　　→ 要 computed style
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  /*
   * ── 一、成版係書房張相，書企喺層板上（2026-10-15 第二版）─────────
   *
   * 舊版量「五條 1px 線」。改版之後成版係書房 /img/study/zhai-wide.webp（直屏 zhai-tall.webp），
   * 所以量嘅係：相喺度、第一層嘅書底貼住闊景相高 40.2% 嗰塊層板（±1.5%；1280×1000 係橫屏，用闊景）。
   */
  const caseInfo = await page.evaluate(() => {
    const jia = document.querySelector('.jia');
    const tu = document.querySelector('.jia-tu');
    const r = jia.getBoundingClientRect();
    const first = [...document.querySelectorAll('.jia-ceng[data-ceng="0"] .ji')];
    return {
      image: tu ? getComputedStyle(tu).backgroundImage : 'none',
      bottoms: first.map((el) => ((el.getBoundingClientRect().bottom - r.top) / r.height) * 100),
    };
  });
  check('書櫃係書房張相', caseInfo.image.includes('/img/study/zhai-wide.webp'), caseInfo.image);
  check('第一層有書', caseInfo.bottoms.length > 0, '冇書');
  for (const b of caseInfo.bottoms) check('書企喺層板上', Math.abs(b - 40.2) <= 1.5, `書底喺 ${b.toFixed(1)}%`);

  /*
   * ── 一之二、書脊係布面相，書名喺題簽入面（2026-10-15 第三版）─────────
   *
   * 每條書脊（「＋ 新書」除外）用 /img/study/ji-*.webp；書名每個字都要喺張相題簽嘅位入面
   * （高 8.6%–50%，左右 14.5%–85.5%，留 1px 誤差）。
   */
  const spines = await page.evaluate(() =>
    [...document.querySelectorAll('.jia .ji:not([data-kind="new"])')].map((el) => {
      const r = el.getBoundingClientRect();
      const zi = [...el.querySelectorAll('.ji-qian > span')].map((z) => z.getBoundingClientRect());
      return {
        image: getComputedStyle(el).backgroundImage,
        inSlip: zi.every((z) => z.top >= r.top + r.height * 0.086 - 1 && z.bottom <= r.top + r.height * 0.5 + 1 && z.left >= r.left + r.width * 0.145 - 1 && z.right <= r.left + r.width * 0.855 + 1),
        zi: zi.length,
      };
    }),
  );
  check('有書脊', spines.length > 0, '冇');
  for (const sp of spines) {
    check('書脊係布面相', /\/img\/study\/ji-(lu|lan|he|zhu|wu)\.webp/.test(sp.image), sp.image);
    check('書名喺題簽入面', sp.inSlip && sp.zi > 0, `${sp.zi} 個字`);
  }

  /*
   * ── 二、仍然零透視、零圓角（陰影同布紋而家准用）─────────
   *
   * 改版准咗木紋相、書脊布紋同陰影；但書脊照舊係平面嘅 —— 冇 perspective、冇圓角。
   */
  const materials = await page.evaluate(() =>
    ['.jia', '.ji'].flatMap((sel) =>
      [...document.querySelectorAll(sel)].map((el) => {
        const cs = getComputedStyle(el);
        return { sel: el.className, perspective: cs.perspective, radius: cs.borderTopLeftRadius };
      }),
    ),
  );
  for (const r of materials) {
    check(`${r.sel} 零透視`, r.perspective === 'none', r.perspective);
    check(`${r.sel} 零圓角`, r.radius === '0px', r.radius);
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
    const tu = document.querySelector('.jia-tu');
    const cs = getComputedStyle(tu);
    return {
      opacity: cs.opacity,
      display: cs.display,
      width: tu.getBoundingClientRect().width,
      cover: Boolean(document.querySelector('.ji-kong .shu')),
      coverShape: document.querySelector('.ji-kong .shu')?.dataset.shape,
    };
  });
  check('書櫃淡到 16%', dim.opacity === '0.16', `opacity ${dim.opacity}`);
  check('書櫃冇消失', dim.display !== 'none' && dim.width > 100, `${dim.display} ${dim.width}px`);
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
console.log('✓ 書架：書房書櫃、布面書脊相、書名喺題簽、書企喺層板上、零透視零圓角、hover 升 10px、取書淡到 16% 但冇消失');
