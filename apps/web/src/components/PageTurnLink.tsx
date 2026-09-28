'use client';

import { useEffect, useRef, type ComponentProps, type MouseEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';

/**
 * 翻頁連結（書桌閱讀）
 *
 * 喺本書入面由一頁去另一頁（上一章、下一章、目次入面嘅一章、展卷嘅「讀下去」），
 * 唔好一下跳咗過去 —— 先有一頁紙繞住書脊翻過去，然後先轉。
 *
 *   `next`　右頁向左翻（向前讀）
 *   `prev`　左頁向右翻（翻返轉頭）
 *
 * 做法：撳落去即刻 prefetch，同時喺最近嗰本書（`.shuzhuo-shu` 或 `.fan`）
 * 加 `data-fanye`，CSS 畫一頁紙翻過去（globals.css「翻頁」）；翻完先 `router.push`。
 *
 * 照舊係一條真嘅 `<a>`：新分頁開、右鍵、鍵盤、冇 JS 都照行。
 * reduced-motion：唔翻，即刻去。
 */
const TURN_MS = 650;

export function PageTurnLink({
  direction = 'next',
  href,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { direction?: 'next' | 'prev'; href: string }) {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    /* 新分頁、新視窗、中鍵：交返畀瀏覽器 */
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const book = e.currentTarget.closest('.shuzhuo-shu, .fan') ?? document.querySelector('.shuzhuo-shu, .fan');
    if (!book) return;

    e.preventDefault();
    router.prefetch(href);
    book.setAttribute('data-fanye', direction);
    timer.current = window.setTimeout(() => router.push(href), TURN_MS);
  };

  return <Link href={href} onClick={handle} {...rest} />;
}
