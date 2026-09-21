'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart } from '@/components/Chart';
import { chartStateAt, resolveSlot } from '@/lib/suidu';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';

/**
 * 隨讀：右側細命盤跟捲動高亮（工單 F2 · 視覺系統 §8）
 *
 * ⚠ 三個決定寫喺呢度，因為三個都係「唔做乜」：
 *
 * 一、**個盤撳唔郁。** 佢跟住字行 —— 一個撳得嘅盤會令讀者以為
 *     佢揀咗嘅嘢會留低，但下一秒捲動就改咗佢。一件自己會變嘅控制項，
 *     比一件唔郁嘅裝飾差。
 *
 * 二、**手機唔出。** §8 同 E2 一樣嘅理由：400px 唔可以橫向滾。
 *     收起用 CSS（`display: none`），唔係闊度零 —— 一個闊度零嘅盤
 *     仲喺無障礙樹入面，讀屏會由頭到尾讀十二格睇唔見嘅字。
 *
 * 三、**冇 JS 都要企得住。** 預設亮住本章嗰一宮；observer 行起之後
 *     先開始跟。所以關咗 JS 見到嘅係一個靜態、啱嘅盤，唔係一版空。
 */
export function Suidu({
  chart,
  palace,
  children,
}: {
  chart: ZChart;
  /** 本章讀緊邊一宮。 */
  palace: string;
  /** 正文。入面每一段要有 `data-slot`。 */
  children: React.ReactNode;
}) {
  const wen = useRef<HTMLDivElement>(null);
  /** null = 仲未開始跟（或者跟唔到）→ 用本章嗰一宮做預設。 */
  const [slot, setSlot] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const root = wen.current;
    if (!root) return;
    const paras = [...root.querySelectorAll<HTMLElement>('[data-slot]')];
    if (paras.length === 0) return;

    setLive(true);

    /*
     * ⚠ 揀「最接近版心上三分一」嗰一段，唔係「第一個入到視窗」嗰段。
     *
     * 後者喺捲快嗰陣會一次過報幾段，然後亮嘅係最底嗰段 ——
     * 而讀者嘅眼喺上面。三分一線係一個讀緊嘅人眼睛所在嘅位置。
     */
    /*
     * ⚠ 揀「壓住讀線嗰一段」，唔係「最接近讀線嗰一段」。
     *
     * 讀線 = 版面三分一高 —— 一個讀緊嘅人隻眼所在嘅位置。
     * 「最接近」嗰個版本喺捲到底嗰陣會揀錯：最後幾段全部喺讀線下面，
     * 而「最接近」會揀中間嗰段，讀者隻眼其實喺最尾嗰句。
     *
     * 「壓住」就冇呢個問題 —— 一段要真係橫跨嗰條線先算數。
     * 一條線都壓唔到（段落之間嘅空隙）就保住上一段，唔閃。
     */
    const pick = () => {
      const line = window.innerHeight / 3;
      let best: HTMLElement | null = null;
      for (const el of paras) {
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) {
          best = el;
          break;
        }
      }
      if (!best) return;
      setSlot((prev) => resolveSlot(best?.dataset.slot ?? null, prev));
    };

    pick();
    const onScroll = () => window.requestAnimationFrame(pick);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [children]);

  /* 未跟到（冇 JS、冇段落）就亮住本章嗰一宮 —— 一個靜態而啱嘅盤。 */
  const state = live
    ? chartStateAt(chart, palace, slot)
    : chartStateAt(chart, palace, '開場');

  return (
    <div className="suidu">
      <div className="suidu-wen" ref={wen}>
        {children}
      </div>

      {/* `data-at` 唔係樣式 hook —— 係畀 `check-juan.mjs` 知道而家跟緊邊一格。 */}
      <aside className="suidu-pan" aria-hidden="true" data-at={live ? (slot ?? '') : '開場'}>
        <div className="suidu-ding">
          <Chart
            chart={chart}
            selected={state.selected}
            relations={state.relations}
            interactive={false}
            onSelect={() => {}}
            maxWidth={260}
            center={
              <p className="text-center font-sans text-cap tracking-[0.16em] text-ink-3">
                {palace}
              </p>
            }
          />
        </div>
      </aside>
    </div>
  );
}
