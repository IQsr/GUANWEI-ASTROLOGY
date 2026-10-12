/**
 * 一生十二步只列到虛歲九十歲左右起步嗰幾步（2026-10-02，見 daxian.ts `lifeStepsChapter`）。
 * 細讀講「行到某星嗰步運」嘅規則都跟呢條線：嗰步運九十歲先起，讀者喺大限章搵唔到，就唔講（branch.ts）。
 */
export const STEPS_UNTIL_AGE = 90;

const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

/** 歲數、步數用中文數字（大限章、細讀共用）：四十六、一百零二 */
export function num(n: number): string {
  if (n >= 100) {
    const r = n % 100;
    return `一百${r === 0 ? '' : r < 10 ? `零${DIGITS[r]}` : num(r)}`;
  }
  if (n < 10) return DIGITS[n]!;
  if (n < 20) return `十${n % 10 ? DIGITS[n % 10] : ''}`;
  return `${DIGITS[Math.floor(n / 10)]}十${n % 10 ? DIGITS[n % 10] : ''}`;
}
