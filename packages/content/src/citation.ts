import { BRANCH_TOPICS, slotPattern, stripOr } from './branch';
import { DAXIAN_HUA, LOOKBACK_EVENTS, firstClause } from './daxian';
import { CORPUS } from './lexicon';
import { LIFE_LINES } from './life';
import { PAIR_PLAIN, PALACE_PLAIN } from './palace-plain';
import { tmSentence } from './en/render';
import { huaClauseEn } from './en/time';
import { XINGXI } from './xingxi';

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
 *   四、性格的骨架：星系嘅基本講法、兩頭偏向句（2026-10-12）—— 譯自每個星系開頭嗰段
 *   五、這十年、這一年第一句嘅四化分句（2026-10-18 · A2）—— 就係二嗰句嘅第一分句，出處一樣；
 *       一句可以有化祿化忌兩個分句，兩個出處都回。通用句（AREA_HUA）冇逐句出處，唔收。
 *   六、生活句有王亭之出處嗰 85 句（2026-10-18）—— life.ts 載入時已經逐字核過引文
 *   七、宮位結論句有 `source` 嗰啲（2026-10-18 · A2 第三步）—— 逐格對過宮垣論，palace-plain.ts 載入時核引文
 * 舊有嘅宮位基塊、結論句、冇出處嘅生活句未收：審查指出佢哋掛嘅《全書》古文撐唔起後面嘅描述，
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

/** `re`：模板句（有〔〕泛稱，branch.ts `fillSlots` 填咗盤上嘅星）用比對式對 */
/** 英文模板句（〔〕填咗星名）：〔〕換成任意字；比對前已經細楷、去句尾標點 */
function enSlotPattern(t: string): RegExp {
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* 填完「Lu and Zuo Fu and You Bi」會改成「Lu, Zuo Fu and You Bi」（en/render.ts fillEn）：〔〕前面嘅 and 兩款都收 */
  const parts = t.toLowerCase().replace(/[.;:,]$/, '').split(/〔[^〕]+〕|｛[^｝]+｝/);
  const body = parts.map((p, i) => (i < parts.length - 1 && p.endsWith(' and ') ? `${esc(p.slice(0, -5))}(?: and |, )` : esc(p))).join('.+?');
  /* ｛｝同「會照」一齊（「｛Huo or Ling｝ meeting your chart」）：填咗宮名都收 */
  return new RegExp(body.replace(/in your trine|in your four directions|meeting your chart/, '(?:$&|in your .+?)'));
}

/** 模板句又有「會照的」：宮名都收（「或」填實 + 填宮名，branch.ts `fillOr`、`placeHui`） */
const orHui = (re: RegExp) => new RegExp(re.source.replace('會照的', '(?:會照|[^，。]+?宮)的'));

/** 骨架章「會照的X」填咗宮名（branch.ts `placeHui`） */
const escCite = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function huiPattern(t: string): RegExp {
  return new RegExp(escCite(t.replace(/。$/, '')).replace('會照的', '(?:會照|[^，。]+?宮)的'));
}
function enHuiPattern(t: string): RegExp {
  const body = escCite(t.toLowerCase().replace(/[.;:,]$/, ''));
  return new RegExp(body.replace(/in your trine|in your four directions|meeting your chart/, '(?:in your trine|in your four directions|meeting your chart|in your .+?)'));
}

/** `clause`：四化分句 —— 一句入面可以有兩個，citeOf 會合埋兩個出處 */
export type CiteKey = { key: string; ids: string[]; re?: RegExp; clause?: true };

function build(): { zh: CiteKey[]; en: CiteKey[] } {
  const zh: CiteKey[] = [];
  const en: CiteKey[] = [];
  for (const t of BRANCH_TOPICS)
    for (const r of t.rules) {
      const ids = [r.source.passage, ...(r.also ?? []).map((a) => a.passage)];
      /* 改過字嘅規則：舊寫法（`was`）照認（R-008） */
      for (const v of [{ text: r.text, en: r.en }, ...(r.was ?? [])]) {
        for (const s of sentencesZh(v.text)) zh.push(/[〔｛]/.test(s) ? { key: stripOr(s), ids, re: orHui(slotPattern(s.replace(/。$/, ''), false)) } : s.includes('會照的') ? { key: s, ids, re: huiPattern(s) } : { key: s, ids });
        for (const s of sentencesEn(v.en))
          en.push(/[〔｛]/.test(s) ? { key: stripOr(s), ids, re: enSlotPattern(s) } : s.includes('會照的') || /in your (?:trine|four directions)|meeting your chart/.test(s) ? { key: s, ids, re: enHuiPattern(s) } : { key: s, ids });
      }
      if (r.tail) zh.push({ key: r.tail, ids });
      if (r.tailEn) en.push({ key: r.tailEn, ids });
    }
  /* 性格的骨架：星系嘅基本講法同兩頭偏向句，掛星系開頭嗰段原文（branch/xingxi/*.json `basis`） */
  for (const t of BRANCH_TOPICS) {
    if (t.topic.xingxi === undefined || !t.basis) continue;
    const x = XINGXI.find((y) => y.n === t.topic.xingxi);
    if (!x) continue;
    const ids = [t.basis.passage];
    for (const text of [x.plain.basis, ...x.poles.map((p) => x.plain.lean[p] ?? '')])
      for (const s of sentencesZh(text)) zh.push(s.includes('｛') ? { key: stripOr(s), ids, re: slotPattern(s.replace(/。$/, ''), false) } : { key: s, ids });
    for (const text of [x.plain.basis, ...x.poles.map((p) => x.plain.lean[p] ?? '')]) {
      const e = tmSentence(stripOr(text));
      if (e) for (const s of sentencesEn(e)) en.push({ key: s, ids });
    }
  }
  for (const h of DAXIAN_HUA) {
    zh.push({ key: h.text, ids: [h.source.passage_id] });
    const e = tmSentence(h.text);
    if (e) en.push({ key: e, ids: [h.source.passage_id] });
  }
  /*
   * 這十年、這一年第一句（daxian.ts `periodGist`）用嘅係四化句第一分句。分句短，
   * 所以只配「這十年／這一年」開頭嗰句，唔會配錯第二度啱啱有同一截字嘅句。
   */
  for (const h of DAXIAN_HUA) {
    const ids = [h.source.passage_id];
    const c = firstClause(h.text);
    zh.push({ key: c, ids, clause: true, re: new RegExp(`^這(?:十年|一年).*${escCite(c)}`) });
    const e = huaClauseEn(c);
    if (e) en.push({ key: e, ids, clause: true, re: new RegExp(`^(?:over these ten years|this year).*${escCite(e.toLowerCase())}`) });
  }
  for (const l of LIFE_LINES) {
    if (!l.source) continue;
    const ids = [l.source.passage_id];
    for (const s of sentencesZh(l.text)) zh.push({ key: s, ids });
    const e = tmSentence(l.text);
    if (e) for (const s of sentencesEn(e)) en.push({ key: s, ids });
  }
  /* 結論句：只收 summary（留意句未逐句對過）。給你的話清單前面會加「工作上，」—— 按包含配，一樣配得到 */
  for (const p of PALACE_PLAIN) {
    if (!p.source) continue;
    const ids = [p.source.passage_id];
    zh.push({ key: p.summary, ids });
    const e = tmSentence(p.summary);
    if (e) en.push({ key: e, ids });
  }
  /* 雙星整合版：英文跟條目存 */
  for (const p of PAIR_PLAIN) {
    if (!p.source) continue;
    const ids = [p.source.passage_id];
    zh.push({ key: p.summary, ids });
    en.push({ key: p.en.summary, ids });
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
  const match = (k: CiteKey) => (k.re ? k.re.test(norm(s)) : norm(s).includes(norm(k.key)));
  const hit = list.find(match);
  if (!hit) return null;
  if (!hit.clause) return hit.ids;
  /* 四化分句：化祿化忌兩截各有出處，合埋（次序跟句子入面出現嘅先後） */
  const at = (k: CiteKey) => norm(s).indexOf(norm(k.key));
  const clauses = list.filter((k) => k.clause && match(k)).sort((a, b) => at(a) - at(b));
  return [...new Set(clauses.flatMap((k) => k.ids))];
}

/** 測試／診斷用：索引幾多句 */
export const CITE_INDEX_SIZE = { zh: INDEX.zh.length, en: INDEX.en.length };
