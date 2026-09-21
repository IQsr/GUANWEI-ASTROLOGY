'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Phase = 'static' | 'pending' | 'shown';

/**
 * 入場動效（視覺系統 §7）。
 *
 * 六條規矩入面呢個 component 負責四條：
 *   一次過 —— 觸發之後即刻 unobserve，scroll 返上去唔會重播
 *   單向   —— 只有 translateY(14px) + opacity，位移喺 CSS 度鎖死
 *   慢     —— 900ms（--dur-3）
 *   對等   —— prefers-reduced-motion 之下完全唔會進入 pending
 *
 * 關鍵：SSR 出嚟嘅 HTML 一定係可見狀態（phase 由 'static' 開始，
 * 淨係得 .rv）。'pending' 只會喺 client、而且確認咗元素喺視窗之下
 * 先入。所以關咗 JS、thumbnail、分享預覽全部照睇到內容。
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** 同組錯落用，60–90ms 一級，最多五件（視覺系統 §7）。 */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // 已經喺視窗入面嘅嘢唔使做任何嘢 —— 佢本來就應該睇到。
    if (el.getBoundingClientRect().top <= window.innerHeight) return;

    setPhase('pending');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          setPhase('shown');
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const phaseClass = phase === 'pending' ? 'rv-pend' : phase === 'shown' ? 'rv-show' : '';

  return (
    <div
      ref={ref}
      className={`rv ${phaseClass} ${className}`.trim()}
      style={delay && phase !== 'static' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
