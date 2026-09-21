import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * 流程層頁頂嗰兩件工具：返書齋、日夜讀。
 *
 * ⚠ 題名幕（E5）**唔用佢** —— 嗰一幕一件工具都唔可以有。
 * 所以佢住喺 client component 入面，唔住喺個 page 度：
 * 一個由 server render 嘅 header 收唔起。
 *
 * 揭開咗之後佢就返嚟：嗰陣已經係喺度讀緊，唔再係嗰一下。
 */
export function FlowChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-x-10 gap-y-4 border-b jielan pb-5">
        <Link
          href="/shelf"
          className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
        >
          ← 書齋
        </Link>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>
      {children}
    </>
  );
}
