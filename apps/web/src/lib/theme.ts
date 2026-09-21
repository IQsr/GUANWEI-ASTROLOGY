import { inlineRead } from '@/lib/local';

export { LOCAL_KEYS } from '@/lib/local';

/**
 * 要喺任何 React 程式碼行之前跑，否則揀咗夜讀嘅人會見到一閃嘅紙白。
 * 放喺 <head> 做同步 script。
 *
 * key 由 `lib/local.ts` 出 —— 全站得嗰度提得起 `localStorage`（G1）。
 */
export const themeInitScript = `try{var t=${inlineRead('theme')};if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`;
