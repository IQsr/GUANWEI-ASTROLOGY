import { StarWindow } from '@/components/StarWindow';

/**
 * 書房夜景：張相 ＋ 窗外會郁嘅星 ＋ 一層壓暗（重新設計）
 *
 * 兩個用法：
 *
 *   `home`  首頁。跟住 `<main className="ye">` 一齊捲，左邊同下面壓暗畀字企穩。
 *   `desk`  落款 → 題名 → 展卷。固定喺視窗背後、唔跟捲動，成幅壓暗到
 *           大約三成亮、微微模糊 —— 你喺張枱前面坐低，本書喺面前打開。
 *           一入嚟由首頁嗰個光度慢慢暗落去（`.ye-dim`，900ms）。
 *
 * ⚠ `desk` 用 `position: fixed`，唔係將 `<main>` 變成一幕全屏：
 * 咁落款頁本身嘅版面（卷首、天頭 64 / 地腳 40、版心置中）一樣都唔使郁，
 * `check-juanshou` 同 `check-naming` 量嘅嘢照舊。
 *
 * `StarWindow` 由佢嘅 parent 讀 `--ye-pos`，所以張相同星一定要喺同一個 `.ye` 入面。
 */
export function NightScene({ variant }: { variant: 'home' | 'desk' }) {
  if (variant === 'home') {
    return (
      <>
        <div className="ye-tu" aria-hidden="true" />
        <StarWindow />
        <div className="ye-an" aria-hidden="true" />
      </>
    );
  }
  return (
    <div className="ye ye-desk" aria-hidden="true">
      <div className="ye-tu" />
      <StarWindow />
      <div className="ye-dim" />
    </div>
  );
}
