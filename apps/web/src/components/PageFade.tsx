'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 轉頁淡入（2026-10-15）
 *
 * 全站轉頁唔再白閃一下：舊頁淡走、新頁淡入，約 180ms（globals.css `::view-transition-*`）。
 * 唔係品牌過場 —— 讀者成日跳嚟跳去，要短到唔覺自己喺度等。
 *
 * 做法：用瀏覽器自己嘅 `document.startViewTransition`，唔用 React 實驗版嘅 `<ViewTransition>`
 * （Next 要開 `experimental.viewTransition`，成個站會轉用實驗版 React，唔值）。
 * 喺 capture 階段截住站內連結，先影低舊頁，再 `router.push`；新頁 commit 咗（pathname 變）
 * 先放手畀瀏覽器淡入。
 *
 * ⚠ 等新頁嗰陣成版係凍住嘅（瀏覽器唔畫）。翻頁嗰次教訓係「lag 一 lag」—— 所以最多等
 * `WAIT_MS`，等唔到就照淡入，新嘢遲啲自己出。
 *
 * 唔截：
 *   · 新分頁、中鍵、modifier、`target`、`download`、站外、/api
 *   · 同一頁（淨係 query / hash 變）
 *   · 本書入面嘅翻頁（`PageTurnLink` 有自己嘅翻頁動畫，`data-page-turn`）
 *   · reduced-motion、瀏覽器唔支援 —— 直接到位
 *
 * 連結有 `data-vt="名"`：撳嗰刻先畀佢個 `view-transition-name`，新頁同名嗰樣嘢就由佢變出嚟
 * （書齋：書脊 → 書桌上攤開嗰本書，`.shuzhuo-shu`）。名要撳先畀 —— 一櫃書唔可以同名。
 *
 * 瀏覽器「返回」唔經呢度（popstate 截唔到），照舊即刻換。
 */
const WAIT_MS = 400;

let arrive: (() => void) | null = null;

export function PageFade() {
  const router = useRouter();
  const pathname = usePathname();

  useLayoutEffect(() => {
    arrive?.();
    arrive = null;
  }, [pathname]);

  useEffect(() => {
    if (typeof document.startViewTransition !== 'function') return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (still.matches) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-page-turn')) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === location.pathname) return;

      e.preventDefault();
      const name = a.dataset.vt;
      if (name) a.style.viewTransitionName = name;
      /*
       * ⚠ 轉頁唔可以靠過場：瀏覽器未畫到嘢（分頁喺後面）嗰陣 callback 未必行，
       * 擺入去就會撳咗冇反應。所以即刻 push —— 新頁最快都要一個來回先到，
       * 瀏覽器下一格就影低舊頁，趕得切。
       */
      const landed = new Promise<void>((done) => {
        arrive = done;
        window.setTimeout(done, WAIT_MS);
      });
      const vt = document.startViewTransition(() => landed);
      router.push(url.pathname + url.search + url.hash);
      if (name) vt.finished.finally(() => a.style.removeProperty('view-transition-name'));
    };

    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [router]);

  return null;
}
