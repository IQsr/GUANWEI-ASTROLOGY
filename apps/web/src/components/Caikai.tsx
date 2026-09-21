'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CUT_MS } from '@/lib/weicai';

/**
 * 裁開：右邊毛邊由上而下裂開一次，1600ms（工單 F4 · 架構 §6）
 *
 * ⚠ 「一生只播一次」唔係由呢度決定。
 *
 * 呢個 component 收到 `children` 就播 —— 播唔播，係 DB 答嘅：
 * `cut_page()` 回 true 先至係「今次先裁開」（0006）。
 * 記喺 localStorage 嘅話，清 cookie 或者換部機就會再裂一次，
 * 而一本已經裁開咗嘅書唔會自己癒合。
 *
 * ⚠ 正文由第一幀起就已經喺 DOM 度，淨係畀一張紙蓋住。
 * 唔係「動畫完先 render」—— 噉樣嘅話關咗 JS 就冇字睇，
 * 而讀者係畀咗錢嘅。
 */
export function Caikai({ play = true, children }: { play?: boolean; children: ReactNode }) {
  /*
   * ⚠ `play` 預設 true，但真嗰條路一定要明寫。
   *
   * 一章裁開咗之後，每次揭返嚟都再裂一次嘅話，「一生一次」就變咗
   * 「每次一次」—— 而一本已經裁開咗嘅書唔會自己癒合返再裂。
   */
  const [done, setDone] = useState(!play);

  useEffect(() => {
    if (!play) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDone(true);
      return;
    }
    const timer = window.setTimeout(() => setDone(true), CUT_MS);
    return () => window.clearTimeout(timer);
  }, [play]);

  return (
    <div className="caikai" data-cutting={done ? '0' : '1'}>
      {!done ? (
        <div
          className="caikai-zhi"
          aria-hidden="true"
          style={{ ['--cut-dur' as string]: `${CUT_MS}ms` }}
        />
      ) : null}
      {children}
    </div>
  );
}
