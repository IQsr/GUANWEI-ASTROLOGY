'use client';

import { useEffect, useRef } from 'react';
import { markRead } from '@/app/[locale]/book/[bookId]/[chapter]/actions';

/**
 * 讀到呢一章（工單 G5）
 *
 * ⚠ 呢個元件冇畫面。
 *
 * E3 個書架按 `last_read_at` 排序（「最近讀嗰本喺最左」），
 * 但到 G5 之前**冇一個地方寫過嗰一欄** —— 條 AC 一直靠 `created_at` 撐住。
 *
 * 一個 mount 揈一次。`useRef` 擋住 React 18 開發模式嗰次重複 effect：
 * 揈兩次唔會壞（同一個值寫兩次），但揈兩次係一次多餘嘅網絡來回。
 */
export function MarkRead({ bookId, slug }: { bookId: string; slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void markRead(bookId, slug);
  }, [bookId, slug]);
  return null;
}
