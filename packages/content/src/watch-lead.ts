/*
 * 結論段「要留意的是：」嘅轉接語輪換（2026-10-11 內容審查：一本書十二次同一個開頭，讀落似模板）。
 * 第一個係原句；翻譯表（en/tm.json）只存原句嗰款，`en/render.ts` 會認返。
 * 獨立一個檔：assemble 同 en/render 都要用，放喺 assemble.ts 會 circular import。
 */
export const WATCH_LEADS = ['要留意的是：', '不過，', '但', '只是', '要留意的是，', '而且'] as const;
/** 結論段輪換（2026-10-13 起唔再用冒號版） */
export const WATCH_ROTATION = ['要留意的是，', '不過，', '但', '只是'] as const;
/** 舊書用過、而家唔再出嘅轉接語（英文版照認得）。「另一面是：」2026-10-13 改「但」：冒號太多，似 AI。 */
export const OLD_WATCH_LEADS = ['另一面是：'] as const;

export const varyWatch = (watch: string, lead: string | undefined) =>
  lead && watch.startsWith(WATCH_LEADS[0]) ? lead + watch.slice(WATCH_LEADS[0].length) : watch;

/*
 * 轉接語要啱前後方向（2026-10-18 · 後生讀者抽樣 B10）。
 * 「但／只是／不過」假設結論講長處、留意句講代價。結論本身已經講限制（「你和後輩之間容易不和」），
 * 或者句入面已經轉過一次（「客氣，但不盲從」），再接「只是」就讀唔通：
 *   - 留意句係建議（「⋯比學會休息更有用」）→「不過，」：問題 → 做法，轉折啱。
 *   - 留意句再講一個代價 →「而且」：同一方向。
 * 判斷寧願多認做限制：認錯只係少咗變化，唔會讀唔通。
 */
const TURNED = /但|卻|不過|只是|可是|然而/;
const LIMIT =
  /不和|不合|合不來|不易|摩擦|不太安|各異|盤算|不是你的強項|不與人|煩|反而|隔膜|隔閡|代溝|疏離|疏遠|緣分較淺|緣份較淺|爭|口舌|口角|不安|不寧|不宜|不相宜|不適合|不多|不順|不長久|不太好|不肯讓|不上心|心計|反覆|焦慮|憂|急躁|空想|掛慮|一拖再拖|起落|起伏|波動|成見|角力|分成幾派|結尾差|先好後壞|一時|寡合|費神|費心|不算廣|只顧自己|拆台|參半|硬撐|攬|來來去去|常在更換|疲|累|耗|難|未必|少有|淡|孤|冷|吃虧|辛苦|操心|勞|晚|遲|阻|損|破|散|失|壓力|不得|多變|容易(?!有名聲|被|討人|安穩|穩)/;
const ADVICE = /更有用|更能|更重要|有效|要緊|最好|最有用|值得|宜|需要|記得|試著|不妨|多留|練習|要學會|也要|要主動|不必|要給|要留心/;

export function fitWatchLead(summary: string, watch: string, lead: string | undefined): string | undefined {
  if (!lead || !watch.startsWith(WATCH_LEADS[0]) || lead === '要留意的是，') return lead;
  if (!TURNED.test(summary) && !LIMIT.test(summary)) return lead;
  return ADVICE.test(watch) ? '不過，' : '而且';
}
