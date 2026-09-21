/**
 * 朱砂方印（視覺系統 §8）
 *
 * 全站朱砂面積 ≤ 1%，呢一枚就係其中最大嗰塊 —— 所以佢細，
 * 而且一版只出現一次。
 *
 * 樣式喺 globals.css 嘅 .yin：外框朱砂、內一條紙色細界、陰文。
 * 零圓角零陰影 —— 方印本身就係實色方塊，唔使任何深度效果。
 * 亦都冇刻意整崩邊或者旋轉：嗰啲係「過度仿古」（視覺系統 §10）。
 */
export function Seal({
  text,
  label,
  className = '',
  style,
}: {
  /** 印文，一至四個字。 */
  text: string;
  /** 畀讀屏用 —— 印係圖唔係字。 */
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const chars = [...text];
  return (
    <span className={`yin ${className}`.trim()} style={style} role="img" aria-label={label}>
      <span style={{ gridTemplateRows: `repeat(${chars.length}, auto)` }}>
        {chars.map((c, i) => (
          <span key={`${c}-${i}`} aria-hidden="true">
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}
