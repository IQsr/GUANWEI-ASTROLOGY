import { BRANCH_TOPICS } from './branch';
import { DAXIAN_HUA, LOOKBACK_EVENTS } from './daxian';
import { CORPUS } from './lexicon';
import { tmSentence } from './en/render';

/* ───────────────────────────────────────────────────────────
 * 出處註（2026-10-12 · Issac：「人哋 challenge 我哋，要講得出喺邊本書、邊一頁、邊一節」）
 *
 * 正文唔再靠「可能」「容易」去避責任；講得肯定嘅句，要喺句尾撳得出原文。
 * 呢度係「句子 → 出處」嘅索引，web 嗰邊標註層嗰陣按句配（apps/web lib/zhu.ts）。
 *
 * 只收**真係由嗰段原文寫出嚟**嘅句：
 *   一、原文分支（branch.ts）—— 逐條核過條件同引文
 *   二、大限／流年四化句（daxian/hua.json）—— 每句由一段四化原文撮出
 *   三、回看嘅事件句（daxian/events.json）—— 條件跟書，句子婉轉
 * 舊有嘅宮位基塊、結論句、生活句未收：審查指出佢哋掛嘅《全書》古文撐唔起後面嘅描述，
 * 加註只會令讀者對照時發現對唔上。轉做分支規則之後先加。
 *
 * 配對係「句子包含索引句」：四化句入書時前面會加「天機化祿在你的官祿宮：」。
 * 按句配、讀嗰陣先配，所以舊書（R-008）有同一句都會有註；書本身一個字都冇改。
 * ─────────────────────────────────────────────────────────── */

export type Citation = {
  /** 語料庫 passage id */
  id: string;
  author: string;
  authorEn: string;
  book: string;
  /** 英文讀者見嘅書名（原書冇英譯本，係我哋譯） */
  bookEn: string;
  page: number;
  /** 「下篇 · 宮垣論 · 事業宮 · 子午天機」 */
  section: string;
  /** 原文照錄（簡體，PDF 本） */
  text: string;
};

const AUTHOR = '王亭之';
const BOOK = '中州派紫微斗數深造講義';

export function citation(id: string): Citation | null {
  const p = CORPUS.zhongzhou?.passages[id] as { chapter?: string; ref?: string; lines?: [number, number]; text: string } | undefined;
  if (!p || !p.lines) return null;
  return {
    id,
    author: AUTHOR,
    authorEn: 'Wang Tingzhi',
    book: BOOK,
    bookEn: 'Advanced Lectures on Zhongzhou School Zi Wei Dou Shu',
    page: p.lines[0],
    section: [p.chapter, p.ref].filter(Boolean).join(' · '),
    text: p.text.replace(/\s+/g, ''),
  };
}

const sentencesZh = (t: string) => (t.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
const sentencesEn = (t: string) => (t.match(/[^.!?]+[.!?]+/g) ?? [t]).map((s) => s.trim()).filter(Boolean);

export type CiteKey = { key: string; ids: string[] };

function build(): { zh: CiteKey[]; en: CiteKey[] } {
  const zh: CiteKey[] = [];
  const en: CiteKey[] = [];
  for (const t of BRANCH_TOPICS)
    for (const r of t.rules) {
      const ids = [r.source.passage, ...(r.also ?? []).map((a) => a.passage)];
      for (const s of sentencesZh(r.text)) zh.push({ key: s, ids });
      for (const s of sentencesEn(r.en)) en.push({ key: s, ids });
      if (r.tail) zh.push({ key: r.tail, ids });
      if (r.tailEn) en.push({ key: r.tailEn, ids });
    }
  for (const h of DAXIAN_HUA) {
    zh.push({ key: h.text, ids: [h.source.passage_id] });
    const e = tmSentence(h.text);
    if (e) en.push({ key: e, ids: [h.source.passage_id] });
  }
  for (const e of LOOKBACK_EVENTS) zh.push({ key: e.text, ids: e.sources.map((s) => s.passage_id) });
  /* 長嘅行先：一句包含兩條索引句時，揀最具體嗰條 */
  const byLen = (a: CiteKey, b: CiteKey) => b.key.length - a.key.length;
  return { zh: zh.filter((k) => k.ids.every((id) => citation(id))).sort(byLen), en: en.sort(byLen) };
}

const INDEX = build();

/** 一句正文嘅出處（冇就 null）。`lang`：英文閱讀模式用英文句配。 */
export function citeOf(sentence: string, lang: 'zh' | 'en' = 'zh'): string[] | null {
  const list = lang === 'en' ? INDEX.en : INDEX.zh;
  const s = sentence.trim();
  /* 英文：入書時句頭大細楷、句尾標點可能唔同，比較時一律細楷、去句尾標點 */
  /* 英文渲染會喺星名後面加花名「Ju Men (the Great Gate)」：比較前拎走 */
  const norm = (x: string) =>
    lang === 'en' ? x.replace(/\s*\(the [^)]*\)/g, '').toLowerCase().replace(/[.;:,]$/, '') : x.replace(/。$/, '');
  const hit = list.find((k) => norm(s).includes(norm(k.key)));
  return hit ? hit.ids : null;
}

/** 測試／診斷用：索引幾多句 */
export const CITE_INDEX_SIZE = { zh: INDEX.zh.length, en: INDEX.en.length };
