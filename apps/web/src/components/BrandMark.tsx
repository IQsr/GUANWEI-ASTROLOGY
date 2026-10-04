/**
 * 星敘標誌（2026-10-04）：圓形星軌 ＋ 一條書脊。
 *
 * 外圈係天，斜嘅一圈係星軌，中間企住嗰條係一本書嘅書脊 —— 「以星為序，以你為章」。
 * 細線、`currentColor`：喺夜景上面跟住頁頂變燙金，喺紙上面變墨色。
 * 細過 24px（分頁圖示）就用 `small`：拎走星軌同細星，淨低圓、書脊、一粒星，唔會糊埋一舊。
 *
 * ⚠ 呢個係過渡版本。正式標誌由設計師畫好之後，換走呢個檔入面嘅 path 就得，
 *    用到佢嘅地方唔使改。
 */
export function BrandMark({ size = 32, small = false, className }: { size?: number; small?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="50" cy="50" r="44" strokeWidth={small ? 6 : 2.2} />
      {small ? null : <ellipse cx="50" cy="50" rx="43" ry="15" strokeWidth="1.3" transform="rotate(-24 50 50)" />}
      {/* 書脊：尖頂、直身 */}
      <path d="M50 20 L57 33 L57 76 L43 76 L43 33 Z" strokeWidth={small ? 6 : 2.2} />
      <circle cx="78" cy="36" r={small ? 7 : 3} fill="currentColor" stroke="none" />
      {small ? null : (
        <>
          <circle cx="23" cy="64" r="2" fill="currentColor" stroke="none" />
          <circle cx="66" cy="83" r="1.5" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
