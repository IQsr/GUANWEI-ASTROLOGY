/**
 * 未裁之頁（工單 F4 · 架構 §6）
 *
 * 線裝書「毛邊本」：書頁邊位未裁開，要讀者自己裁。
 * **未買嘅深度章 = 未裁嘅頁。**
 *
 * ── ⚠ 三樣唔准用，而三樣都係同一個意思 ──
 *
 * 工單寫死：「唔用 modal、唔用模糊偷睇、唔用倒數」。
 *
 *   modal      蓋住本書，逼你即刻答「買定唔買」
 *   模糊偷睇   將正文糊咗畀你望 —— 即係「睇得到但係唔畀你睇」
 *   倒數       製造一個唔存在嘅時限
 *
 * 三樣都係喺讀嘅過程入面插一個**銷售動作**。
 * 一版毛邊冇呢啲：佢就係一版未裁開嘅紙，靜靜噉喺度。
 *
 * ── ⚠ 未裁 ≠ 收埋 ──
 *
 * 架構 §6：「未裁章喺目錄**照樣列出章名**，唔收埋。」
 * 所以未裁嘅頁一樣講得出佢有幾多格、係乜嘢格（`slots`，0006 特登
 * 同 `body` 分開兩欄）。你揸得到本書，只係未裁開。
 */

/** 裁開動畫：右邊毛邊由上而下裂開一次（架構 §6）。 */
export const CUT_MS = 1600;

export type CutTarget = { href: string; label: string };

/**
 * 撳「裁開」去邊（架構 §6：`/claim`（未認領先認領）→ `/pay/[bookId]`）。
 *
 * ⚠ 匿名讀者唔可以直接入 checkout —— 架構 §4 嘅硬閘。
 * 而嗰道閘唔止喺呢度：DB 有個 trigger 擋住匿名讀者出票（G1），
 * 所以就算有人繞過呢個連結，webhook 嗰條路一樣過唔到。
 */
export function cutTarget(bookId: string, isAnonymous: boolean): CutTarget {
  return isAnonymous
    ? { href: '/claim', label: '裁開' }
    : { href: `/pay/${bookId}`, label: '裁開' };
}

/**
 * 一版未裁嘅頁畫幾多條毛邊。
 *
 * ⚠ 跟段落數，唔係隨機。
 *
 * 隨機嘅話，同一章每次入嚟毛邊都唔同 —— 而一本書嘅同一版
 * 唔會今日五條邊、聽日八條。跟段落數就係「呢一版有幾多嘢」，
 * 亦即係讀者唯一應該由一版未裁嘅紙度讀到嘅資訊。
 */
export function notches(slotCount: number): number {
  if (slotCount <= 0) return 32;
  return Math.min(72, Math.max(28, slotCount * 8));
}

export type CutPhase = 'uncut' | 'cutting' | 'read';

/**
 * 一章而家應該用邊個狀態渲染。
 *
 * - `body` 攞唔到 → 未裁
 * - 攞到，而且**今次先裁開** → 裂開（播一次）
 * - 攞到，之前已經裁咗 → 直接讀
 */
export function cutPhase(body: string | null, justCut: boolean): CutPhase {
  if (body === null) return 'uncut';
  return justCut ? 'cutting' : 'read';
}

/**
 * 毛邊本身：一條 `clip-path: polygon()`（視覺 §6「零張圖片」）。
 *
 * ⚠ 右邊嗰條邊唔係鋸齒，係**撕痕**。
 *
 * 分別喺於規律：一排等距等深嘅三角形讀落係一個圖案（或者一個 icon），
 * 而撕開嘅紙每一下深淺唔同。所以深度由一條固定嘅序列出 ——
 * 睇落唔規則，但同一版永遠一樣（同 `notches()` 一個道理）。
 *
 * 唔用 border-radius（視覺 §2「圓角一律 0」）、唔用陰影、唔用圖。
 */
/*
 * ⚠ 淺同密。
 *
 * 第一版用 2–3.6%、十條邊：影咗相一睇就知錯 —— 出嚟係一排大梯級，
 * 似一個圖案多過似一張撕開嘅紙。一張紙撕開嘅邊係**細同碎**嘅：
 * 起伏一兩毫米，一版書幾十下。
 */
const DEPTH = [
  0.55, 0.22, 0.78, 0.35, 0.62, 0.18, 0.71, 0.44, 0.29, 0.66, 0.5, 0.24, 0.74, 0.38,
];

export function deckle(n: number): string {
  const count = Math.max(2, n);
  const pts: string[] = ['0% 0%'];
  for (let i = 0; i <= count; i++) {
    const y = (i / count) * 100;
    const d = DEPTH[i % DEPTH.length]!;
    pts.push(`${(100 - d).toFixed(2)}% ${y.toFixed(2)}%`);
  }
  pts.push('0% 100%');
  return `polygon(${pts.join(', ')})`;
}
