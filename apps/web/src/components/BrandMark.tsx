import { useId } from 'react';

/**
 * 星敘標誌（2026-11-15）：一枚圓印，入面係「星敘」兩個字。
 *
 * Issac 揀嘅方向：篆刻風格嘅線條字 —— 筆劃粗幼一致、全部橫線直線加細圓角，伸到貼住外圈先停。
 * 上面「星」（日 ＋ 生），中間一條橫線分隔，下面「敘」（左余、右攴）。
 * 「又」嗰兩筆用梯級折線砌出交叉：試過弧線同斜線，Issac 話破壞咗成個直線嘅感覺。
 *
 * `currentColor`：喺夜景上面跟住頁頂變燙金，喺紙上面變墨色。
 * 筆劃畫過界，再用圓形 clipPath 裁走，所以啲線係貼實外圈。
 *
 * ⚠ 個印永遠同「星敘 STELLOGUE」字樣一齊出現 —— 印章字本身唔求一眼讀得出。
 * ⚠ 分頁圖示（`app/icon.svg`）仲係舊嘅圓 ＋ 書脊：16px 放唔落兩個字。
 * `small` 留返做相容，而家冇分別。
 */
export function BrandMark({ size = 32, className }: { size?: number; small?: boolean; className?: string }) {
  const clip = useId();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="88" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {/* 星：日 */}
        <rect x="76" y="28" width="48" height="26" rx="6" />
        <path d="M76 41 L124 41" />
        {/* 星：生（底下嗰一橫同時係兩個字之間嘅分隔線） */}
        <path d="M66 60 L66 68 L200 68" />
        <path d="M100 60 L100 94" />
        <path d="M0 81 L134 81" />
        <path d="M0 94 L200 94" />
        {/* 敘：余 */}
        <path d="M40 128 L40 116 Q40 108 48 108 L88 108 Q96 108 96 116 L96 128" />
        <path d="M68 108 L68 200" />
        <path d="M54 122 L82 122" />
        <path d="M0 136 L84 136" />
        <path d="M52 150 L52 166" />
        <path d="M84 150 L84 166" />
        {/* 敘：攴 —— 卜 */}
        <path d="M136 106 L136 119" />
        <path d="M136 113 L200 113" />
        {/* 敘：攴 —— 又（梯級折線，兩筆喺中間交叉） */}
        <path d="M112 130 L160 130 L160 144 L140 144 L140 166 L122 166 L122 200" />
        <path d="M120 155 L156 155 L156 200" />
      </g>
      <circle cx="100" cy="100" r="90" strokeWidth="7" />
    </svg>
  );
}
