'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  CELLS,
  LINES,
  RULE_MS,
  STAR_MS,
  ZHANJUAN_MS,
  lineDelay,
  starDelay,
} from '@/lib/zhanjuan';

/**
 * 展卷（工單 E6 · 視覺系統 §9）
 *
 * 「書真正打開，界欄逐條畫出成十二宮，星以點落位，然後就係命書正文。」
 *
 * ── ⚠ 唔用 spinner ──
 *
 * 呢一幕嘅位置本來係「等」：舊流程要喺呢度排盤。
 * 但盤喺題名嗰陣已經算好（E5），所以而家**冇嘢等緊** ——
 * 呢一幕係一個開場，唔係一個 loading。
 *
 * 一個 spinner 講嘅係「請等我」；一段畫出嚟嘅界欄講嘅係
 * 「呢張圖而家先為你畫」。兩樣嘢佔同一段時間，但意思相反。
 *
 * ── ⚠ 全站唯一一次 pin scroll ──
 *
 * 視覺 §7 第五條：「鎖 scroll 只准一次 —— pin 淨係『展卷』封面翻開嗰下。」
 * 所以鎖 scroll 呢件事**全個 app 只喺呢個檔做**，
 * 而 `test/zhanjuan.test.ts` 掃住呢一點：第二個地方一寫就爆。
 */
export function Zhanjuan({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDone(true);
      return;
    }
    const timer = window.setTimeout(() => setDone(true), ZHANJUAN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  /*
   * ⚠ 鎖 scroll 要記得解。
   *
   * 一個鎖咗就冇解嘅 scroll，係一版讀唔到嘅書 —— 而呢一幕之後
   * 正正就係成本書最長嗰一版。所以 cleanup 唔係禮貌，係必需。
   */
  useEffect(() => {
    if (done) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [done]);

  if (done) return <>{children}</>;

  return (
    <div className="zhan" aria-hidden="true" data-zhan="1">
      {LINES.map((line, i) => (
        <span
          key={i}
          className="zhan-xian"
          data-axis={line.axis}
          style={{
            [line.axis === 'heng' ? 'left' : 'top']: `${line.from}%`,
            [line.axis === 'heng' ? 'top' : 'left']: `${line.at}%`,
            ['--zhan-len' as string]: `${line.to - line.from}%`,
            ['--zhan-dur' as string]: `${RULE_MS}ms`,
            animationDelay: `${lineDelay(i)}ms`,
          }}
        />
      ))}

      {/* 星以點落位 —— 界欄畫完之後先落。 */}
      <span className="zhan-dian">
        {CELLS.map(([row, col], i) => (
          <i
            key={`${row}-${col}`}
            style={{
              gridRow: row,
              gridColumn: col,
              ['--zhan-star' as string]: `${STAR_MS}ms`,
              animationDelay: `${starDelay(i)}ms`,
            }}
          />
        ))}
      </span>
    </div>
  );
}
