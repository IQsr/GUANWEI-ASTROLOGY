/**
 * 一段字入面每個字只留一次 —— 預載字體（`FontWarm`）淨係要知用到邊啲字。
 * 放喺 lib 唔放喺元件：server 嗰邊（章版）要叫佢，而 'use client' 檔案嘅函數 server 叫唔到。
 */
export function distinctChars(s: string): string {
  return [...new Set(s.replace(/\s/g, ''))].join('');
}
