'use client';

import { useSyncExternalStore } from 'react';

/**
 * 靜場：一幕之中收起頁頂導覽（重新設計第四期）
 *
 * 全站有導覽（Issac 2026-09 揀嘅），但題名幕（E5）係一個例外：
 * 「呢一幕冇任何掣 —— 用戶淨係睇」。一幕情感高點，頂上掛住
 * 首頁／起盤／藏經閣／我的書齋，就唔再係一幕。
 *
 * 所以 `Naming` 行緊嗰幾秒叫 `setQuiet(true)`，揭開本書就 `false`。
 * 導覽唔係淡咗或者 `inert` —— 係**唔 render**，`check-naming.mjs`
 * 數成版嘅互動元素，一個都唔准有。
 *
 * 一個 module 級嘅值加 `useSyncExternalStore`：兩個 component 唔喺
 * 同一棵樹嘅上下，唔值得為一個 boolean 開 context。
 */
let quiet = false;
/**
 * 啱啱由靜場返嚟（2026-09）：導覽要淡入，唔好「啪」一聲出現。
 * 揭開本書之後導覽同卷首係同本書放大一齊返嚟嘅 —— 硬切會變返嗰種割裂感。
 */
let back = false;
const listeners = new Set<() => void>();

export function setQuiet(next: boolean) {
  if (quiet === next) return;
  back = quiet && !next;
  quiet = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useQuiet(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => quiet,
    () => false,
  );
}

/** 導覽係咪啱啱由靜場返嚟（用嚟淡入）。 */
export function useQuietBack(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => back,
    () => false,
  );
}
