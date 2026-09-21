import type { ReactNode } from 'react';
import { SHAPE_OF, type BookState } from '@/lib/book';

/**
 * 「書」元件（工單 E2）
 *
 * E 線其餘五張全部食佢：
 *
 *   E3 書齋　　架上一排 `spine`，取書 → `cover`
 *   E4 落款　　`spread`，左頁目錄、右頁逐題
 *   E5 題名　　`spread` → `titled`，書合埋，封面浮出個名
 *   E6 展卷　　`titled` → `open`，界欄逐條畫出成十二宮
 *
 * ── 呢個元件唔做嘅嘢 ──
 *
 * 佢唔揸狀態、唔識幾時要轉、唔知入面係封面定係命盤。
 * 佢淨係識：收到一個狀態，就變成嗰個形。
 *
 * 所以佢係 server component —— 冇 `'use client'`、冇 effect、
 * 冇 `useState`。轉場全部係 CSS 嘅 width transition，
 * reduced-motion 亦都由 CSS 收（驗收標準第三條）。
 *
 * ⚠ **`verso` 唔准放必需嘅嘢。** 手機闊度之下個書收成單頁
 * （驗收標準第二條），而收起嗰版係用 `display:none` 收 ——
 * 讀屏都唔會讀到。`active` 就係畀 caller 揀邊一版行先。
 */
export function Book({
  state,
  active = 'recto',
  label,
  spine,
  cover,
  verso,
  recto,
  overlay,
  className = '',
}: {
  /** 五個狀態。幾何只有三個形，對應表喺 `lib/book.ts`。 */
  state: BookState;
  /** 手機收成單頁嗰陣睇邊一版。預設右頁 —— 落款同正文都喺右頁。 */
  active?: 'verso' | 'recto';
  /** 成本書嘅無障礙名。書係一件物件，唔係一段文字。 */
  label: string;
  /** 書脊上面嘅字，逐個字直排。淨係 `spine` 狀態見到。 */
  spine?: string;
  /** 封面。`spine` / `cover` / `titled` 三個狀態見到。 */
  cover?: ReactNode;
  /** 左頁。`spread` / `open` 見到。 */
  verso?: ReactNode;
  /** 右頁。`spread` / `open` 見到。 */
  recto?: ReactNode;
  /**
   * 蓋喺成本書上面嗰一層（E5 加）。
   *
   * 佢喺 `.shu` 入面，所以佢**啱啱好係本書嗰個框**，唔多唔少 ——
   * 一個「撳本書」嘅熱區如果由外面砌，就會連本書右邊嗰片空白都收埋。
   */
  overlay?: ReactNode;
  className?: string;
}) {
  const shape = SHAPE_OF[state];
  const opened = shape === 'opened';

  return (
    <div className={`shu-wrap ${className}`.trim()}>
      <article
        className="shu"
        data-shape={shape}
        data-state={state}
        data-active={active}
        aria-label={label}
      >
        {/*
         * 左頁。合埋嗰陣闊度係零，但佢仲喺 DOM 度（要長返出嚟先動得到），
         * 所以要 inert —— 一版睇唔見嘅嘢唔應該撳得到、讀得到。
         */}
        <div className="shu-ye shu-verso" {...(opened ? {} : { inert: true })}>
          <div className="shu-nei">{verso}</div>
        </div>

        <div className="shu-ji" {...(state === 'spine' ? {} : { inert: true })}>
          {spine ? (
            <span className="shu-ji-zi" aria-hidden="true">
              {[...spine].map((zi, i) => (
                <span key={`${zi}-${i}`}>{zi}</span>
              ))}
            </span>
          ) : null}
        </div>

        {/*
         * 右頁：封面同內頁兩層疊住，靠 opacity 換。
         * 兩層都留喺 DOM，因為由封面淡去內頁嗰下係轉場本身；
         * 但睇唔見嗰層一樣要 inert。
         */}
        <div className="shu-ye shu-recto">
          <div className="shu-mian" {...(opened ? { inert: true } : {})}>
            {cover}
          </div>
          <div className="shu-nei" {...(opened ? {} : { inert: true })}>
            {recto}
          </div>
        </div>

        {overlay}
      </article>
    </div>
  );
}
