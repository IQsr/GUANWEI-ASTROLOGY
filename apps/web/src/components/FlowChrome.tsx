import type { ReactNode } from 'react';
import { Juanshou } from '@/components/Juanshou';

/**
 * 流程層頁頂嗰兩件工具：返書齋、日夜讀。
 *
 * ⚠ 題名幕（E5）**唔用佢** —— 嗰一幕一件工具都唔可以有。
 * 所以佢住喺 client component 入面，唔住喺個 page 度：
 * 一個由 server render 嘅 header 收唔起。
 *
 * 揭開咗之後佢就返嚟：嗰陣已經係喺度讀緊，唔再係嗰一下。
 *
 * ⚠ 佢自己唔再畫嗰條橫欄 —— 交返畀 `Juanshou`。
 * 之前呢度同其餘六版各寫一次，而「各寫一次」就係「唔夠連貫」個源頭。
 */
export function FlowChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <Juanshou back="shelf" theme />
      {children}
    </>
  );
}
