/**
 * 首頁星空窗嘅幾何（由 `scripts/make-hero.mjs` 生成 —— 唔好手改）。
 *
 * 張相嘅原尺寸同窗入面「天」嘅範圍，單位係相嘅 pixel。
 * canvas 靠佢將星撒喺窗入面；真正嘅邊界由 `/hero/sky.png` 遮罩決定。
 */
export const HERO = {
  src: '/hero/study.webp',
  mask: '/hero/sky.png',
  width: 1672,
  height: 941,
  sky: { x0: 828, y0: 54, x1: 1469, y1: 361 },
} as const;
