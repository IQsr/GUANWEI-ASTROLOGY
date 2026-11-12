'use client';

import { useTranslations } from 'next-intl';
import { useQuiet } from '@/lib/quiet';

/**
 * 跳到內容（2026-11-12 · Modern Web Guidance skip links）
 *
 * 鍵盤用戶第一下 Tab 就見到，撳落去跳過頁頂導覽。
 *
 * ⚠ 靜場（題名幕，見 lib/quiet.ts）嗰陣同頁頂導覽一樣**唔 render**：
 * 嗰一幕「冇任何掣」，`check-naming.mjs` 數成版嘅互動元素同 `[tabindex]`，
 * 一個都唔准有。導覽都收埋咗，亦冇嘢要跳過。
 */
export function SkipLink() {
  const t = useTranslations('nav');
  const quiet = useQuiet();
  if (quiet) return null;
  return (
    <a href="#content" className="skip-link">
      {t('skip')}
    </a>
  );
}

/** 跳到內容嘅落腳點：包住每頁內容。靜場嗰陣唔掛 tabindex（理由同上）。 */
export function SkipTarget({ children }: { children: React.ReactNode }) {
  const quiet = useQuiet();
  return (
    <div id="content" tabIndex={quiet ? undefined : -1} className="outline-none">
      {children}
    </div>
  );
}
