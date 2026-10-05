import tmRaw from './tm.json';
import { AREA_EN, AREA_ON_EN, PALACE_EN, cap, listEn, star, starFirst } from './terms';

/* ───────────────────────────────────────────────────────────
 * 英文版：由砌好嘅中文章逐句譯（2026-10-05 · 試做命宮）
 *
 * 點解唔另寫一套英文砌法：中文嗰邊揀乜講、剷邊句重複、點樣截長短，全部係內容決定（assemble.ts
 * 幾百行）。英文另寫一次就會兩邊走樣。所以英文只管「點講」：
 *
 *   一、資料句（基塊、修飾語、生活場景⋯）→ 翻譯表（`tm.json` 嘅 sentences）
 *   二、程式砌出嚟嘅句（「你的命宮坐天同、天梁。」）→ 下面嘅模板，入面嗰截再查翻譯表（clauses）
 *
 * 譯唔到嘅句唔會靜靜雞出中文：回 `missing`，測試列晒出嚟。
 * ─────────────────────────────────────────────────────────── */

const TM = tmRaw as { sentences: Record<string, string>; clauses: Record<string, string> };

export type Rendered = { text: string; missing: string[] };

const sentencesOf = (t: string) => (t.match(/[^。！？]*[。！？]|[^。！？]+/g) ?? []).map((s) => s.trim()).filter(Boolean);

/** 一截（冇句號）：查 clauses */
function clause(zh: string, missing: string[]): string {
  const en = TM.clauses[zh];
  if (en) return en;
  missing.push(zh);
  return `〔${zh}〕`;
}

/** 「天同、天梁」→「Tian Tong and Tian Liang」 */
function starsList(zh: string, missing: string[]): string {
  return listEn(
    zh.split('、').map((s) => {
      const en = star(s);
      if (!en) missing.push(s);
      return en ?? `〔${s}〕`;
    }),
  );
}

/* 牽動格開頭四款（link.ts 嘅 HEADS），英文各自一款 */
const LINK_HEADS: [RegExp, (list: string) => string][] = [
  [/^這一面也和你的(.+)連在一起$/, (l) => `This side of you is also tied to ${l}.`],
  [/^放在整張盤看，這一面和你的(.+)分不開$/, (l) => `Seen across the whole chart, this side of you can't be separated from ${l}.`],
  [/^牽動這一面的，還有你的(.+)$/, (l) => `Also pulling on this side of you: ${l}.`],
  [/^你的(.+)，也會影響這一面$/, (l) => `${cap(l)} shape this side of you too.`],
];

/** 程式砌出嚟嘅句。認唔到回 null。 */
function template(s: string, missing: string[]): string | null {
  /* 開場事實：你的命宮坐天同、天梁。 */
  let m = /^你的(\S+?)坐(.+)。$/.exec(s);
  if (m && PALACE_EN[m[1]!.replace(/宮$/, '')] !== undefined) {
    return `Your ${PALACE_EN[m[1]!.replace(/宮$/, '')]} holds ${starsList(m[2]!, missing)}.`;
  }
  if (m && PALACE_EN[m[1]!]) return `Your ${PALACE_EN[m[1]!]} holds ${starsList(m[2]!, missing)}.`;

  /* 擾動：同宮還有火星：⋯。／還有鈴星：⋯。 */
  m = /^(同宮還有|還有)(\S{2})：(.+)。$/.exec(s);
  if (m) {
    const name = starFirst(m[2]!);
    if (!name) missing.push(m[2]!);
    const body = clause(m[3]!, missing);
    return m[1] === '同宮還有' ? `Also in this palace is ${name}: ${body}.` : `And ${name}: ${body}.`;
  }

  /* 牽動：開頭：在外時，⋯；工作上，⋯；錢方面，⋯。 */
  const colon = s.indexOf('：');
  if (colon > 0 && s.endsWith('。')) {
    const head = s.slice(0, colon);
    const h = LINK_HEADS.find(([re]) => re.test(head));
    if (h) {
      const listZh = h[0].exec(head)![1]!;
      const items = listZh.split(/、|和/).map((a) => {
        const en = AREA_EN[a]?.[0];
        if (!en) missing.push(a);
        return en ?? `〔${a}〕`;
      });
      const parts = s
        .slice(colon + 1, -1)
        .split('；')
        .map((part) => {
          const c = part.indexOf('，');
          const on = AREA_ON_EN[part.slice(0, c)];
          if (c < 0 || !on) {
            missing.push(part);
            return `〔${part}〕`;
          }
          return `${on}, ${lowerFirst(clause(part.slice(c + 1), missing))}.`;
        });
      return [h[1](listEn(items)), ...parts].join(' ');
    }
  }
  return null;
}

/* 句中嘅星名、專有名詞唔好細楷 */
const lowerFirst = (s: string) => (/^(Tian|Tai|Zi|Wu|Lian|Tan|Ju|Qi|Po|Huo|Ling|Di|Qing|Tuo|Lu|Zuo|You|Wen)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/** 一段（可以幾句）。 */
export function renderParagraph(zh: string): Rendered {
  const missing: string[] = [];
  const out = sentencesOf(zh).map((s) => TM.sentences[s] ?? template(s, missing) ?? (missing.push(s), `〔${s}〕`));
  return { text: out.join(' '), missing };
}

/** 成章（段落用空行分）。 */
export function renderChapter(zh: string): Rendered {
  const paras = zh.split('\n\n').map(renderParagraph);
  return { text: paras.map((p) => p.text).join('\n\n'), missing: paras.flatMap((p) => p.missing) };
}

/** 翻譯表入面所有英文（畀英文 lint 掃） */
export const allEnglish = (): string[] => [...Object.values(TM.sentences), ...Object.values(TM.clauses)];
