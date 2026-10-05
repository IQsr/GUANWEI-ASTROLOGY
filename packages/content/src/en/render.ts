import tmRaw from './tm.json';
import { AREA_EN, AREA_ON_EN, PALACE_EN, STAR_EN, cap, listEn, star, starFirst } from './terms';

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
  [/^這一面也和你的(.+)連在一起$/, (l) => `This side of you also connects with ${l}.`],
  [/^放在整張盤看，這一面和你的(.+)分不開$/, (l) => `Seen across the whole chart, this side of you can't be separated from ${l}.`],
  [/^牽動這一面的，還有你的(.+)$/, (l) => `Also pulling on this side of you: ${l}.`],
  [/^你的(.+)，也會影響這一面$/, (l) => `${cap(l)} shape this side of you too.`],
];

/** 牽動格最後一截：「家裡是天梁、朋輩之間是太陽，分別見〈田宅〉〈兄弟〉兩章」 */
function refPart(part: string, missing: string[]): string | null {
  const m = /^(.+)，(?:見|分別見)((?:〈[^〉]+〉)+)(?:那一章|[兩三]章)$/.exec(part);
  if (!m) return null;
  const pairs = m[1]!.split('、').map((x) => {
    const mm = /^(.+)是(\S{2})$/.exec(x);
    const on = mm ? AREA_ON_EN[mm[1]!] : undefined;
    const st = mm ? star(mm[2]!) : null;
    if (!on || !st) {
      missing.push(x);
      return `〔${x}〕`;
    }
    return `${lowerFirst(on)} it is ${st}`;
  });
  const chs = [...m[2]!.matchAll(/〈([^〉]+)〉/g)].map((x) => {
    const p = PALACE_EN[x[1]!];
    if (!p) missing.push(x[1]!);
    return `the ${p ?? x[1]} chapter`;
  });
  return `${cap(listEn(pairs))} — see ${listEn(chs)}.`;
}

/**
 * 資料句，連組裝時改過頭嘅版本（assemble.ts `withSubject`）：
 *   「天同：不搶、不計較⋯。」→「Tian Tong: 」＋ 原句
 *   「天同改造的成本高⋯。」（原句「它改造的成本高⋯。」）→ 原句譯文，開頭 It 換星名
 */
function lookupSentence(s: string): string | null {
  const direct = TM.sentences[s];
  if (direct) return direct;
  const pre = /^(\S{2})：(.+)$/.exec(s);
  if (pre && star(pre[1]!)) {
    const rest = TM.sentences[pre[2]!];
    if (rest) return `${star(pre[1]!)}: ${rest}`;
  }
  const head = s.slice(0, 2);
  if (star(head)) {
    const asIt = TM.sentences[`它${s.slice(2)}`];
    if (asIt) return asIt.replace(/^Its\b/, `${star(head)}'s`).replace(/^It\b/, star(head)!);
  }
  return null;
}

/** 程式砌出嚟嘅句。認唔到回 null。 */
function template(s: string, missing: string[]): string | null {
  /* 開場事實：你的命宮坐天同、天梁。 */
  let m = /^你的(\S+?)坐(.+)。$/.exec(s);
  if (m && PALACE_EN[m[1]!.replace(/宮$/, '')] !== undefined) {
    return `Your ${PALACE_EN[m[1]!.replace(/宮$/, '')]} is shaped by ${starsList(m[2]!, missing)}.`;
  }
  if (m && PALACE_EN[m[1]!]) return `Your ${PALACE_EN[m[1]!]} is shaped by ${starsList(m[2]!, missing)}.`;

  /* 空宮（frame.ts emptyPalaceLine） */
  if (s === '此宮無主星，對宮亦無主星，兩宮同看。') return 'Neither this palace nor the one opposite holds a major star, so the two are read together.';
  m = /^此宮無主星，借對宮(.+)參看。$/.exec(s);
  if (m) return `This palace holds no major star of its own, so it is read through ${starsList(m[1]!, missing)} in the opposite palace.`;

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
          const ref = refPart(part, missing);
          if (ref) return ref;
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
  const out = sentencesOf(zh).map((s) => lookupSentence(s) ?? template(s, missing) ?? (missing.push(s), `〔${s}〕`));
  return { text: out.join(' '), missing };
}

/*
 * 主星第一次出現加意思（2026-10-05，睇稿回饋：英文讀者唔知 Tian Tong 係乜）：
 * 「Tian Tong」→「Tian Tong (the Contented)」，一章一次。輔星煞星喺模板度已經加咗。
 */
const MAJORS = Object.values(STAR_EN).slice(0, 14);
function glossFirst(text: string): string {
  let out = text;
  for (const { pinyin, gloss } of MAJORS) {
    /* 唔加喺「Tian Ji's」嗰種所有格度：「Tian Ji (the Strategist)'s」好難讀，留畀下一次出現 */
    const re = new RegExp(`\\b${pinyin}\\b(?! \\()(?!'s)`);
    if (re.test(out)) out = out.replace(re, `${pinyin} (${gloss})`);
  }
  return out;
}

/** 成章（段落用空行分）。 */
export function renderChapter(zh: string): Rendered {
  const paras = zh.split('\n\n').map(renderParagraph);
  return { text: glossFirst(paras.map((p) => p.text).join('\n\n')), missing: paras.flatMap((p) => p.missing) };
}

/** 翻譯表入面所有英文（畀英文 lint 掃） */
export const allEnglish = (): string[] => [...Object.values(TM.sentences), ...Object.values(TM.clauses)];
