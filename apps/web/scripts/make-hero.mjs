/**
 * 首頁星空窗（重新設計第一期）
 *
 * ── 做乜 ──
 *
 * 首頁背景係一張書房相，窗外係夜空。會郁嘅星唔係畫喺張相度，
 * 係一層 canvas 疊喺上面 —— 但星只可以喺**天**度出現，唔可以
 * 落喺山、窗框、燈籠上面。
 *
 * 所以呢個 script 由張相本身量出「邊啲係天」，出一張遮罩：
 *
 *   public/hero/study.webp   張相（原樣複製）
 *   public/hero/sky.png      遮罩：白 = 天，黑 = 其餘；近地平線淡出
 *   src/lib/hero.ts          張相尺寸同窗嘅範圍（canvas 用嚟決定星撒喺邊）
 *
 * ── 點樣認天 ──
 *
 * 呢張相嘅天係一片暗藍（B ≈ 45–57，B − R ≈ 25），山係近黑（B < 30），
 * 窗框同室內係暖啡（R > B）。所以「藍過紅」加「唔係太黑」就係天。
 * 逐條直線由窗頂向下行，第一格唔係天就停 —— 山後面嘅天唔算，
 * 因為一粒星唔會喺山前面。
 *
 * 換相之後照行一次就得：
 *   node scripts/make-hero.mjs <新相.webp>
 * 如果新相嘅天唔係暗藍，要改下面 `isSky` 嗰兩個數。
 */
import { launchBrowser } from './_server.mjs';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = process.argv[2] ?? 'public/hero/study.webp';
const OUT_IMG = 'public/hero/study.webp';
const OUT_MASK = 'public/hero/sky.png';
const OUT_TS = 'src/lib/hero.ts';

mkdirSync('public/hero', { recursive: true });
if (resolve(SRC) !== resolve(OUT_IMG)) copyFileSync(SRC, OUT_IMG);

const b64 = readFileSync(OUT_IMG).toString('base64');
const browser = await launchBrowser();
const page = await browser.newPage();

const result = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0);
  const { data } = cx.getImageData(0, 0, W, H);

  const at = (x, y) => (y * W + x) * 4;
  const isSky = (x, y) => {
    const i = at(x, y);
    const r = data[i];
    const b = data[i + 2];
    return b >= 34 && b - r >= 16;
  };

  /* 一條直線上面連續幾多格係天（由頂計起）。 */
  const probeY = Math.round(H * 0.16);
  const cols = [];
  for (let x = 0; x < W; x++) cols.push(isSky(x, probeY));

  /* 窗 = 探測線上面最長嗰段連續嘅天。窗框同格柵會切開佢。 */
  let best = [0, 0];
  for (let x = 0, start = -1; x <= W; x++) {
    if (x < W && cols[x]) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      if (x - start > best[1] - best[0]) best = [start, x];
      start = -1;
    }
  }
  const [x0, x1] = best;

  /* 窗頂：窗中間嗰條直線，由上面落嚟第一格天。 */
  const mid = Math.round((x0 + x1) / 2);
  let y0 = 0;
  while (y0 < H && !isSky(mid, y0)) y0++;

  /*
   * 逐條直線搵天嘅頂同底（山脊）。
   *
   * ⚠ 兩樣容錯，冇佢哋遮罩會變成一條條直坑：
   *   一、窗頂唔係完全平 —— 有啲直線要落多幾格先見到天，所以頂逐條搵。
   *   二、天入面有相本身嘅星同噪點 —— 連續 GAP 格唔係天先當去到山。
   */
  const GAP = 5;
  const top = new Array(W).fill(y0);
  const ridge = new Array(W).fill(y0);
  for (let x = x0; x < x1; x++) {
    let y = Math.max(0, y0 - 10);
    const limit = y0 + Math.round(H * 0.06);
    while (y < limit && !isSky(x, y)) y++;
    top[x] = y;
    let miss = 0;
    let last = y;
    for (; y < H && miss < GAP; y++) {
      if (isSky(x, y)) {
        miss = 0;
        last = y + 1;
      } else miss++;
    }
    ridge[x] = last;
  }

  /* 山脊喺相入面有噪點，攞中位數磨平，唔係攞平均 —— 一粒亮星唔好拉低成段。 */
  const R = 6;
  const smooth = ridge.slice();
  for (let x = x0; x < x1; x++) {
    const win = ridge.slice(Math.max(x0, x - R), Math.min(x1, x + R + 1)).sort((a, b) => a - b);
    smooth[x] = win[Math.floor(win.length / 2)];
  }
  const y1 = Math.max(...smooth.slice(x0, x1));

  /*
   * 遮罩：天 = 不透明，其餘 = 透明；近山脊嗰段淡出（地平線本來就見唔到咁多星）。
   *
   * ⚠ 用 alpha，唔用黑白。Safari 嘅 `-webkit-mask-image` 只睇 alpha ——
   * 一張全不透明嘅黑白圖喺佢度等於冇遮，星會撒滿成張相。
   */
  const FADE = Math.round(H * 0.07);
  const m = cx.createImageData(W, H);
  for (let x = x0; x < x1; x++) {
    for (let y = top[x]; y < smooth[x]; y++) {
      const i = at(x, y);
      m.data[i] = m.data[i + 1] = m.data[i + 2] = 255;
      m.data[i + 3] = Math.min(1, (smooth[x] - y) / FADE) * 255;
    }
  }
  cx.clearRect(0, 0, W, H);
  cx.putImageData(m, 0, 0);

  return {
    W,
    H,
    win: { x0, y0, x1, y1 },
    mask: cv.toDataURL('image/png').split(',')[1],
  };
}, `data:image/webp;base64,${b64}`);

await browser.close();

writeFileSync(OUT_MASK, Buffer.from(result.mask, 'base64'));

const { W, H, win } = result;
writeFileSync(
  OUT_TS,
  `/**
 * 首頁星空窗嘅幾何（由 \`scripts/make-hero.mjs\` 生成 —— 唔好手改）。
 *
 * 張相嘅原尺寸同窗入面「天」嘅範圍，單位係相嘅 pixel。
 * canvas 靠佢將星撒喺窗入面；真正嘅邊界由 \`/hero/sky.png\` 遮罩決定。
 */
export const HERO = {
  src: '/hero/study.webp',
  mask: '/hero/sky.png',
  width: ${W},
  height: ${H},
  sky: { x0: ${win.x0}, y0: ${win.y0}, x1: ${win.x1}, y1: ${win.y1} },
} as const;
`,
);

console.log(`✓ ${OUT_IMG}  ${W}×${H}`);
console.log(`✓ ${OUT_MASK}  天：x ${win.x0}–${win.x1}，y ${win.y0}–${win.y1}`);
console.log(`✓ ${OUT_TS}`);
