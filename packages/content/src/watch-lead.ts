/*
 * 結論段「要留意的是：」嘅轉接語輪換（2026-10-11 內容審查：一本書十二次同一個開頭，讀落似模板）。
 * 第一個係原句；翻譯表（en/tm.json）只存原句嗰款，`en/render.ts` 會認返。
 * 獨立一個檔：assemble 同 en/render 都要用，放喺 assemble.ts 會 circular import。
 */
export const WATCH_LEADS = ['要留意的是：', '不過，', '但', '只是'] as const;
/** 舊書用過、而家唔再出嘅轉接語（英文版照認得）。「另一面是：」2026-10-13 改「但」：冒號太多，似 AI。 */
export const OLD_WATCH_LEADS = ['另一面是：'] as const;

export const varyWatch = (watch: string, lead: string | undefined) =>
  lead && watch.startsWith(WATCH_LEADS[0]) ? lead + watch.slice(WATCH_LEADS[0].length) : watch;
