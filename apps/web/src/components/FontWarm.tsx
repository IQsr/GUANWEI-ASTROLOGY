'use client';

import { useEffect } from 'react';

/**
 * 預先載下一章要用嘅字（2026-09，Issac：翻頁 lag）
 *
 * 中文字體由 Google Fonts 按 unicode-range 切成幾百片，一版淨係下載佢真係用到嗰幾片。
 * 代價係：翻去新一章，撞到未見過嘅字，瀏覽器先至去攞嗰幾片 —— 量到頭兩次翻頁
 * 每次要等兩三片、最遲一點二秒先到，嗰段時間正文係吉嘅，一段段咁出。
 *
 * 所以打開一章之後，趁瀏覽器得閒，照下一章嘅字（server 算好，每個字一次）
 * 叫 `document.fonts.load()` 先攞定。攞嘅係嗰幾片，唔係成套字。
 *
 * 字體同字重唔寫死：量返呢一版正文同章名實際用緊乜（`getComputedStyle`）。
 */
export function FontWarm({ text }: { text: string }) {
  useEffect(() => {
    if (!text || typeof document === 'undefined' || !('fonts' in document)) return;
    const specs = new Set<string>();
    for (const sel of ['.shuzhuo-you .wen p', '.shuzhuo-you h1']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      specs.add(`${cs.fontWeight} 16px ${cs.fontFamily}`);
    }
    if (specs.size === 0) return;

    const run = () => {
      for (const spec of specs) void document.fonts.load(spec, text).catch(() => {});
    };
    /* Safari 冇 requestIdleCallback：退返用 setTimeout */
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 300);
    return () => clearTimeout(id);
  }, [text]);

  return null;
}
