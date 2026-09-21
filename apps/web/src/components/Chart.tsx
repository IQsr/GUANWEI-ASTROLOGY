'use client';

/* ⚠ 由 `/contract` 攞，唔係由總入口 —— 總入口會拖埋成個引擎落 client（E4）。 */
import { BRANCHES, type Branch, type Chart as ZChart } from '@guanwei/ziwei/contract';

/**
 * 命盤元件（視覺系統 §8 · 工單 F2 底子）
 *
 * 而家係原型級數：排得啱、睇得明、兩個主題同手機闊度都企得住。
 * F2 仲要做嘅係「右側細命盤跟捲動高亮對應宮位」——
 * 所以 selected / onSelect 由外面畀，component 本身唔持 state。
 *
 * 樣式全部喺 globals.css 嘅 .pan / .gong / .xing，行 container query，
 * 所以同一個 component 擺去命書右側縮細都唔使改 CSS。
 */

/** 四乘四盤面。中間兩格係中宮，唔係宮位。 */
const GRID: Record<Branch, [row: number, col: number]> = {
  巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
  辰: [2, 1], 酉: [2, 4],
  卯: [3, 1], 戌: [3, 4],
  寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4],
};

/** 三方四正：本宮、對宮（+6）、三合（+4、+8）。 */
function litState(index: number, selected: number | null): 'self' | 'san' | undefined {
  if (selected === null) return undefined;
  if (index === selected) return 'self';
  const d = (index - selected + 12) % 12;
  return d === 4 || d === 6 || d === 8 ? 'san' : undefined;
}

export function Chart({
  chart,
  selected,
  onSelect,
  center,
  maxWidth = 760,
}: {
  chart: ZChart;
  /** 地支索引 0–11，null = 冇揀。 */
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** 中宮內容。由呼叫者砌 —— 命書同排盤頁想擺嘅嘢唔同。 */
  center: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="pan-wrap" style={{ maxWidth }}>
      <div className="pan">
        {BRANCHES.map((branch, index) => {
          const [row, col] = GRID[branch];
          const palace = chart.palaces.find((p) => p.branch === branch);
          const decadal = chart.decadals.find((d) => d.branch === branch);
          const lit = litState(index, selected);

          return (
            <button
              key={branch}
              type="button"
              className="gong"
              style={{ gridRow: row, gridColumn: col }}
              data-lit={lit}
              data-ming={palace?.name === '命宮' ? '1' : undefined}
              aria-pressed={selected === index}
              onClick={() => onSelect(selected === index ? null : index)}
            >
              <span className="xing-lie">
                {palace?.stars.map((star) => (
                  <span key={star.name} className="xing" data-kind={star.kind}>
                    {[...star.name].map((zi, i) => (
                      <span key={`${zi}-${i}`} className="zi">
                        {zi}
                      </span>
                    ))}
                    <span className="miaowang" data-empty={star.brightness ? undefined : '1'}>
                      {star.brightness ?? '　'}
                    </span>
                    {star.sihua ? (
                      <span className="sihua" data-hua={star.sihua}>
                        {star.sihua}
                      </span>
                    ) : null}
                  </span>
                ))}
              </span>

              <span className="gong-jiao">
                <span className="gong-ming">
                  {palace?.name}
                  {palace?.isShen ? <span className="gong-shen">身</span> : null}
                </span>
                <span className="gong-daxian" data-nums>
                  {decadal ? `${decadal.fromAge}–${decadal.toAge}` : ''}
                </span>
                <span className="gong-zhi">
                  {palace?.stem}
                  {branch}
                </span>
              </span>
            </button>
          );
        })}

        <div className="zhong-gong">{center}</div>
      </div>
    </div>
  );
}
