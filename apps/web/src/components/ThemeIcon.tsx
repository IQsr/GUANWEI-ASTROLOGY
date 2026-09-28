import type { ThemeKey } from '@/lib/themes';

/**
 * 主題卡嗰個圓形細圖（參考稿「閱讀卡片」）
 *
 * 三個都係一筆金線：星（性格）、山（事業）、蓮（人際）。
 * 內聯 SVG，零張圖片、零第三方 —— 同星空窗一樣，唔多一個 host。
 * 顏色跟 `currentColor`，日夜讀自己轉。
 */
const PATHS: Record<ThemeKey | 'xu', string> = {
  /* 八角星：性格與天賦 */
  xing: 'M20 7v26M7 20h26M11 11l18 18M29 11L11 29M20 13l2.2 4.8L27 20l-4.8 2.2L20 27l-2.2-4.8L13 20l4.8-2.2z',
  /* 兩座山：事業方向 */
  shi: 'M6 29l9-12 5 6 5-9 9 15zM15 17l2.5 3.5M25 14l2.8 4.5',
  /* 蓮：人際關係 */
  ren: 'M20 28c-4-3-6-7-6-11 2 1 4.5 3 6 6 1.5-3 4-5 6-6 0 4-2 8-6 11zM20 23c-1-4-1-8 0-12 1 4 1 8 0 12zM8 28c4 2 8 2 12 0 4 2 8 2 12 0',
  /* 一卷：序 */
  xu: 'M10 11h16a4 4 0 010 8H14a4 4 0 000 8h16M10 11a3 3 0 000 6M30 27a3 3 0 010-6',
};

export function ThemeIcon({ kind }: { kind: ThemeKey | 'xu' }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-14 w-14 flex-none place-items-center rounded-full border border-gold text-gold-ink"
    >
      <svg viewBox="4 4 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round">
        <path d={PATHS[kind]} />
      </svg>
    </span>
  );
}
