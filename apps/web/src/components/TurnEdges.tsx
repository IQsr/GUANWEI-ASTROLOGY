'use client';

import { useEffect, useRef } from 'react';
import { PageTurnLink } from '@/components/PageTurnLink';

/** 翻去邊：去處同埋讀屏／tooltip 講嘅名。 */
export type PageTurn = { href: string; label: string };

/**
 * 撳左邊翻前、撳右邊翻後；← → 一樣（書桌閱讀、展卷共用）
 *
 * 好似電子書咁：本書左邊一條窄邊係上一頁，右邊一條窄邊係下一頁。
 * 窄邊擺喺頁邊留白入面 —— 唔蓋住字；右邊離頁邊 10px，讓出右頁嘅捲動條。
 * 滑鼠移過去先見到一條影同一個箭嘴；手機冇 hover，淡淡常見（globals.css）。
 *
 * ⚠ 要放喺一個 `position: relative` 嘅書（`.shuzhuo-shu` 或 `.fan`）入面：
 * 窄邊跟佢定位，翻頁動畫（`PageTurnLink`）亦係搵最近嗰本書。
 *
 * ← → 鍵撳返同一條連結 —— 同一個翻頁動畫、同一個去處。
 * 打緊字、或者撳住 Ctrl／Cmd／Alt／Shift 嗰陣唔攔（嗰啲係瀏覽器自己嘅快捷鍵）。
 */
export function TurnEdges({ prev = null, next = null }: { prev?: PageTurn | null; next?: PageTurn | null }) {
  const prevRef = useRef<HTMLAnchorElement>(null);
  const nextRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      /* target 唔一定係元素（例如 window）—— 先確認先問 closest */
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft' && prevRef.current) {
        e.preventDefault();
        prevRef.current.click();
      } else if (e.key === 'ArrowRight' && nextRef.current) {
        e.preventDefault();
        nextRef.current.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {prev ? (
        <PageTurnLink
          ref={prevRef}
          direction="prev"
          href={prev.href}
          aria-label={prev.label}
          title={prev.label}
          className="shuzhuo-bian shuzhuo-bian-zuo"
        >
          <span aria-hidden="true">‹</span>
        </PageTurnLink>
      ) : null}
      {next ? (
        <PageTurnLink
          ref={nextRef}
          direction="next"
          href={next.href}
          aria-label={next.label}
          title={next.label}
          className="shuzhuo-bian shuzhuo-bian-you"
        >
          <span aria-hidden="true">›</span>
        </PageTurnLink>
      ) : null}
    </>
  );
}
