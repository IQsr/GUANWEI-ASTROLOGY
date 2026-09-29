import { FORBIDDEN_TERMS } from './frame';
import type { Finding } from './lint';

/**
 * 直白（2026-09 · Issac）
 *
 * 讀者多數係帶住煩惱嚟：想快啲知「我係點樣」「會唔會好啲」。
 * 之前嘅寫法兜圈 —— 先講方法、再列一堆條件、答案擺最尾。
 * 呢度係機器捉得到嗰半，人手審嗰半喺 docs/voice.md 第六節。
 *
 *   P1  講方法（「這一章讀⋯」「要分清⋯」）—— 讀者唔需要知我哋點讀
 *   P2  第一句唔係結論：要對住「你」講，而且唔准有星名、四化、廟旺 ——
 *       術語可以用，但要擺喺結論之後做證據
 *   P3  列條件（「見⋯則⋯」「若⋯則⋯」）—— 只講讀者盤上有嘅，唔講冇嘅
 *
 * 暫時只掃六十星系嘅 `plain` 欄（試點）。十二宮章之後另外排期。
 */

const META = /這一章|這一宮|讀這|要分清|須分別|要看你|本質是/;
const CONDITIONAL = /見[^。，；]{1,10}則|若[^。]{0,14}則|化忌則|則偏向/;

/** 第一句：去到第一個「。」或「：」為止。 */
export function firstSentence(text: string): string {
  const m = /^[^。：]*/.exec(text);
  return m ? m[0] : text;
}

export function scanPlain(text: string, field: string, opts: { leadsWithConclusion?: boolean } = {}): Finding[] {
  const out: Finding[] = [];
  const meta = META.exec(text);
  if (meta) {
    out.push({ level: 'error', code: 'P1', field, match: meta[0], message: `講方法：「${meta[0]}」—— 直接講結果` });
  }
  const cond = CONDITIONAL.exec(text);
  if (cond) {
    out.push({ level: 'error', code: 'P3', field, match: cond[0], message: `列條件：「${cond[0]}」—— 只講讀者盤上有嘅` });
  }
  if (opts.leadsWithConclusion) {
    const first = firstSentence(text);
    if (!first.includes('你')) {
      out.push({ level: 'error', code: 'P2', field, match: first, message: `第一句要對住「你」講結論：「${first}」` });
    }
    const terms = FORBIDDEN_TERMS.filter((t) => first.includes(t));
    if (terms.length) {
      out.push({ level: 'error', code: 'P2', field, match: terms.join('、'), message: `第一句有術語「${terms.join('、')}」—— 術語擺結論後面做證據` });
    }
  }
  return out;
}
