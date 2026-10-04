import { BRANCHES, type Branch } from '@guanwei/ziwei/contract';

/**
 * 圓形星盤（2026-10-04 · 參考實體書效果圖嘅金線星盤）
 *
 * 每章尾一個收結裝飾：十二格圍成一圈，呢章講緊嗰一格用金色點出，入面每粒主星一粒點。
 * 純 SVG、伺服器出、零 JS；顏色跟 `--gold-ink`（墨綠頁入面已經換做燙金）。
 *
 * 排法同方格命盤一致：子喺下面，順時針轉（子 → 丑 → 寅 ⋯，即係方格盤由下行向左再向上）。
 * 佢係裝飾，唔係讀資料嘅地方 —— 資料喺左頁個方格盤。所以 aria-hidden，文字說明喺下面嗰行。
 */
export function StarDial({ branch, stars, caption }: { branch: Branch; stars: readonly string[]; caption: string }) {
  const R_OUT = 92;
  const R_IN = 46;
  const idx = BRANCHES.indexOf(branch);
  /* SVG 角度：0° 向右、90° 向下、順時針增加。子喺正下面，每格 30°。 */
  const mid = (i: number) => 90 + 30 * i;
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  };
  const sector = (i: number) => {
    const a0 = mid(i) - 15;
    const a1 = mid(i) + 15;
    const [x0, y0] = pt(a0, R_OUT);
    const [x1, y1] = pt(a1, R_OUT);
    const [x2, y2] = pt(a1, R_IN);
    const [x3, y3] = pt(a0, R_IN);
    return `M${x0} ${y0} A${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R_IN} ${R_IN} 0 0 0 ${x3} ${y3} Z`;
  };
  /* 主星點：喺嗰格入面沿一條弧排開 */
  const dots = stars.map((_, k) => {
    const spread = stars.length > 1 ? (k / (stars.length - 1) - 0.5) * 16 : 0;
    return pt(mid(idx) + spread, (R_OUT + R_IN) / 2 + (k % 2 ? 8 : -4));
  });

  return (
    <figure className="xing-pan">
      <svg viewBox="-112 -112 224 224" aria-hidden="true" fill="none" stroke="currentColor">
        <circle r={R_OUT + 8} strokeWidth="0.6" opacity="0.5" />
        <circle r={R_OUT} strokeWidth="0.9" />
        <circle r={R_IN} strokeWidth="0.7" />
        <circle r="20" strokeWidth="0.6" opacity="0.7" />
        <ellipse rx={R_OUT + 4} ry="30" strokeWidth="0.5" opacity="0.55" transform="rotate(-24)" />
        {BRANCHES.map((_, i) => {
          const [x0, y0] = pt(mid(i) - 15, R_IN);
          const [x1, y1] = pt(mid(i) - 15, R_OUT);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth="0.5" opacity="0.7" />;
        })}
        {idx >= 0 ? <path d={sector(idx)} fill="currentColor" fillOpacity="0.12" strokeWidth="1.4" /> : null}
        {BRANCHES.map((b, i) => {
          const [x, y] = pt(mid(i), R_OUT + 16);
          return (
            <text
              key={b}
              x={x}
              y={y}
              fontSize="9"
              textAnchor="middle"
              dominantBaseline="central"
              fill="currentColor"
              stroke="none"
              opacity={i === idx ? 1 : 0.6}
            >
              {b}
            </text>
          );
        })}
        {dots.map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r="2.4" fill="currentColor" stroke="none" />
        ))}
        <circle r="2.2" fill="currentColor" stroke="none" />
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
