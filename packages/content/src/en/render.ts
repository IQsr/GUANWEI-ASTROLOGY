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

/** 六煞各自改咗啲乜（一本書每粒煞只出現一次，所以唔會重複讀到）。 */
const SHA_ADDS: Record<string, string> = {
  火星: 'adding heat and speed',
  鈴星: 'adding a slow, hidden heat',
  擎羊: 'adding a blunt, cutting edge',
  陀羅: 'slowing things down so they linger',
  地空: 'adding a streak of the ideal over the practical',
  地劫: 'making gains harder to hold on to',
};

/* 牽動格開頭四款（link.ts 嘅 HEADS），英文各自一款。2026-10-05 起開頭唔再列一次範疇 */
const LINK_HEADS: [string, string][] = [
  ['同一種底色，延伸到盤上別處', 'The same pattern carries into other parts of the chart.'],
  ['放在整張盤看', 'Seen across the whole chart, the picture fills out.'],
  ['這一面也受其他幾宮牽動', 'Other parts of the chart pull on this side of you as well.'],
  ['在別的地方，這一面是這樣出現的', 'Elsewhere in the chart, this side of you shows up like this.'],
];

/** 牽動格最後一截：「家裡是天梁，見〈田宅〉那一章」／「家裡是天梁、朋輩之間是太陽，各自那一章另有細講」 */
function refPart(part: string, missing: string[]): string | null {
  const m = /^(.+)，(?:見〈([^〉]+)〉那一章|各自那一章另有細講)$/.exec(part);
  if (!m) return null;
  const pairs = m[1]!.split('、').map((x, i) => {
    const mm = /^(.+)是(\S{2})$/.exec(x);
    const on = mm ? AREA_ON_EN[mm[1]!] : undefined;
    const st = mm ? star(mm[2]!) : null;
    if (!on || !st) {
      missing.push(x);
      return `〔${x}〕`;
    }
    return `${i === 0 ? on : lowerFirst(on)} it is ${st}`;
  });
  if (!m[2]) return `${listEn(pairs)}, each covered in its own chapter.`;
  const p = PALACE_EN[m[2]];
  if (!p) missing.push(m[2]);
  return `${listEn(pairs)} (see the ${p ?? m[2]} chapter).`;
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

  /* 擾動：同宮還有火星：⋯。／還有鈴星：⋯。
   * 睇稿指南第 13 節：煞星唔好得一個標籤 —— 先講佢改咗啲乜，後面嗰截（逐宮寫）講落地點樣。 */
  m = /^(同宮還有|還有)(\S{2})：(.+)。$/.exec(s);
  if (m) {
    const name = starFirst(m[2]!);
    if (!name) missing.push(m[2]!);
    const body = clause(m[3]!, missing);
    const adds = SHA_ADDS[m[2]!];
    if (!adds) return m[1] === '同宮還有' ? `Also in this palace is ${name}: ${body}.` : `And ${name}: ${body}.`;
    return m[1] === '同宮還有' ? `${name} also sits here, ${adds}: ${body}.` : `${name} is here too, ${adds}: ${body}.`;
  }

  /* 牽動：三個宮都講過，淨係得指返句（冇開頭） */
  if (s.endsWith('。') && !s.includes('：')) {
    const ref = refPart(s.slice(0, -1), missing);
    if (ref) return cap(ref);
  }

  /* 牽動：開頭：在外時，⋯；工作上，⋯；錢方面，⋯。 */
  const colon = s.indexOf('：');
  if (colon > 0 && s.endsWith('。')) {
    const head = s.slice(0, colon);
    const h = LINK_HEADS.find(([zh]) => zh === head);
    if (h) {
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
      return [h[1], ...parts].join(' ');
    }
  }
  return null;
}

/* 句中嘅星名、專有名詞唔好細楷 */
const lowerFirst = (s: string) => (/^(Tian|Tai|Zi|Wu|Lian|Tan|Ju|Qi|Po|Huo|Ling|Di|Qing|Tuo|Lu|Zuo|You|Wen)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/*
 * 轉接語成本書輪流用（2026-10-05，睇稿指南第 5 節）
 *
 * 「要留意的是」譯做 The catch／Watch that／Keep in mind that⋯，每句固定一款，
 * 一本書十幾句就會見到同一個開頭出好多次。翻譯表照存一款；呢度喺砌書嗰陣
 * 剝走原本嗰款，換做成本書用得最少、而且唔同上一次嘅一款。後面嗰截句唔郁。
 */
const OPENER = /^(The catch: |The cost: |The risk is that |Watch that |Keep in mind that |Keep in mind: )(.+)$/;
const VARIANTS = [
  'The catch is that ',
  'The trade-off is that ',
  'The other side of this is that ',
  'What complicates this is that ',
  'Keep in mind that ',
  'Watch that ',
  'The risk is that ',
] as const;
/* 唔用「But」：翻譯表本身好多句已經用 But 開頭（生活場景等），再輪多一個就會連續兩句 But。
   唔用「The difficulty is that」：留畀翻譯表嗰八句「難處是⋯」，輪換用咗會同下一章撞款 */

/** 一本書嘅英文狀態：轉接語用咗幾多次、上一次用咗邊款。 */
export type BookState = { used: Map<string, number>; last: string | null };
export const newBookState = (): BookState => ({ used: new Map(), last: null });

/**
 * 輪換一句嘅轉接語。`avoid` = 呢章翻譯表本身已經用咗嘅開頭（例如基塊句「The difficulty is that⋯」）——
 * 輪換唔揀佢哋，唔係前後兩句會撞款。
 */
function rotateOpener(sentence: string, st: BookState, avoid: ReadonlySet<string>): string {
  const m = OPENER.exec(sentence);
  if (!m) {
    /* 翻譯表本身已經用咗某一款開頭：照計數 */
    const natural = VARIANTS.find((v) => sentence.startsWith(v));
    if (natural) {
      st.used.set(natural, (st.used.get(natural) ?? 0) + 1);
      st.last = natural;
    }
    return sentence;
  }
  const clause = m[2]!;
  const pool = VARIANTS.filter((v) => v !== st.last && !avoid.has(v));
  const pick = [...pool].sort((a, b) => (st.used.get(a) ?? 0) - (st.used.get(b) ?? 0))[0]!;
  st.used.set(pick, (st.used.get(pick) ?? 0) + 1);
  st.last = pick;
  const body = clause.startsWith(',') ? clause : lowerFirst(clause);
  return clause.startsWith(',') ? `${pick.trimEnd()}${body}` : `${pick}${body}`;
}

/** 一段譯成英文句（未輪換轉接語）。 */
function paragraphSentences(zh: string, missing: string[]): string[] {
  return sentencesOf(zh).map((s) => lookupSentence(s) ?? template(s, missing) ?? (missing.push(s), `〔${s}〕`));
}

/** 一段（可以幾句）。單獨用嗰陣當呢段自己一本書。 */
export function renderParagraph(zh: string): Rendered {
  return renderChapter(zh);
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

/**
 * 成章（段落用空行分）。砌成本書就由頭到尾傳同一個 `st`，轉接語先會輪得開。
 * 兩步：先譯晒成章，搵出呢章本身用咗嘅開頭；再輪換，避開佢哋。
 */
export function renderChapter(zh: string, st: BookState = newBookState()): Rendered {
  const missing: string[] = [];
  const paras = zh.split('\n\n').map((p) => paragraphSentences(p, missing));
  const avoid = new Set(paras.flat().flatMap((en) => (OPENER.test(en) ? [] : VARIANTS.filter((v) => en.startsWith(v)))));
  const text = paras.map((ss) => ss.map((en) => rotateOpener(en, st, avoid)).join(' ')).join('\n\n');
  return { text: glossFirst(text), missing };
}

/** 翻譯表入面所有英文（畀英文 lint 掃） */
export const allEnglish = (): string[] => [...Object.values(TM.sentences), ...Object.values(TM.clauses)];
