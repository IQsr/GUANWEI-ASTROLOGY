'use client';

import { useEffect, useRef } from 'react';
import { markRead } from '@/app/[locale]/book/[bookId]/[chapter]/actions';
import { chapterHref } from '@/lib/journey';
import { writeSession } from '@/lib/local';

/**
 * 讀到呢一章（工單 G5）
 *
 * ⚠ 呢個元件冇畫面。
 *
 * E3 個書架按 `last_read_at` 排序（「最近讀嗰本喺最左」），
 * 但到 G5 之前**冇一個地方寫過嗰一欄** —— 條 AC 一直靠 `created_at` 撐住。
 *
 * 重新設計第二期：順手喺 sessionStorage 記低「讀緊邊一章」，
 * 藏經閣靠佢出一條「← 回到《章名》」。只係方便 —— 私密視窗寫唔落
 * 就冇嗰條返回，唔會壞（`lib/local.ts` 嘅 `gw-reading`）。
 *
 * 一個 mount 揈一次。`useRef` 擋住 React 18 開發模式嗰次重複 effect：
 * 揈兩次唔會壞（同一個值寫兩次），但揈兩次係一次多餘嘅網絡來回。
 */
export function MarkRead({ bookId, slug, title }: { bookId: string; slug: string; title: string }) {
  const sent = useRef(false);
  useEffect(() => {
    writeSession('reading', JSON.stringify({ href: chapterHref(bookId, slug), title }));
    if (sent.current) return;
    sent.current = true;
    void markRead(bookId, slug);
  }, [bookId, slug, title]);
  return null;
}
