import { LEXICON, type LexiconEntry } from '@guanwei/content';
import { slugOf } from '@/lib/lexicon';

/**
 * 註層：術語點喺邊（工單 F1 · 內容系統 §4 · 架構 §2）
 *
 * ── 註層唔係一個 tooltip ──
 *
 * 內容 §4：「術語墨點展開註層，註層尾連去藏經閣。」
 *
 * 所以一個術語喺命書入面出現，唔係「有一個字可以 hover」，
 * 係**呢本書喺呢一處同你介紹過佢一次**。介紹過就唔使再介紹 ——
 * 一本每次提到「命宮」都標一次點嘅書，讀落似一份說明書。
 *
 * 呢個檔答兩條問題：邊個詞要標、標喺邊。答案要係**確定嘅** ——
 * 同一本書排兩次，標點嘅位要一模一樣（同 C8b 嘅可重現性一路）。
 */

export type TermKind = 'star' | 'palace' | 'sihua' | 'ju';

export type Term = {
  id: string;
  kind: TermKind;
  slug: string;
  /** 喺正文入面真正要搵嘅字。 */
  match: string;
};

/**
 * ⚠ 單字詞條唔可以裸配。
 *
 * 四化嘅詞條 id 係 `sihua.祿`、`sihua.忌` —— 一個字。
 * 如果直接喺正文度搵「祿」，就會撞正「祿存」（一粒輔星，唔係四化）、
 * 「官祿」（一個宮）。**標錯咗嘅註層比冇註層差**：
 * 佢會教一個啱啱學緊嘅人一件錯嘅事。
 *
 * 所以四化只配「化祿」「化權」「化科」「化忌」—— 命書入面
 * 講四化一定係咁寫（C6 修飾語逐句都係）。
 */
function matchOf(entry: LexiconEntry): string {
  const slug = slugOf(entry);
  return entry.kind === 'sihua' ? `化${slug}` : slug;
}

/** 長嘅行先 —— 「紫微」要贏「紫」，「命宮」要贏「命」。 */
export function termIndex(): Term[] {
  return LEXICON.map((e) => ({
    id: e.id,
    kind: e.kind as TermKind,
    slug: slugOf(e),
    match: matchOf(e),
  })).sort((a, b) => b.match.length - a.match.length);
}

export type Run = { text: string; term?: Term };

export type MarkedSegment = { slot: string; runs: Run[] };

export type ChapterInput = { palace: string; segments: { slot: string; text: string }[] };

export type MarkedChapter = { palace: string; segments: MarkedSegment[] };

/** 切句。標點跟返上一句 —— 一句嘢連埋佢個句號先算一句。 */
export function sentences(text: string): string[] {
  return text.match(/[^。！？]*[。！？]|[^。！？]+/g) ?? [];
}

/** 喺一句入面，由左到右搵第一個未用過嘅術語。長嘅行先。 */
function firstTerm(
  sentence: string,
  terms: Term[],
  used: Set<string>,
): { at: number; term: Term } | null {
  for (let i = 0; i < sentence.length; i++) {
    for (const term of terms) {
      if (used.has(term.id)) continue;
      if (sentence.startsWith(term.match, i)) return { at: i, term };
    }
  }
  return null;
}

/**
 * 成本書標一次。
 *
 * ⚠ 兩條規矩：
 *
 * 一、**一個術語全書只標一次**（第一次出現嗰次）。
 *     工單 AC 寫「撳過嘅術語同一本書唔再重複標點」——
 *     做成「只標第一次」比做成「記住撳過邊啲」好：
 *     後者要存狀態（而 localStorage 得兩個 key，G1），
 *     而且重新載入就會由頭標過。**一條唔使記嘢嘅規矩守得住。**
 *
 * 二、**一句最多標一個**。兩點喺同一句，讀者要停兩次。
 */
export function markBook(chapters: ChapterInput[]): MarkedChapter[] {
  const terms = termIndex();
  const used = new Set<string>();

  return chapters.map((ch) => ({
    palace: ch.palace,
    segments: ch.segments.map((seg) => {
      const runs: Run[] = [];
      for (const sentence of sentences(seg.text)) {
        const hit = firstTerm(sentence, terms, used);
        if (!hit) {
          runs.push({ text: sentence });
          continue;
        }
        used.add(hit.term.id);
        const end = hit.at + hit.term.match.length;
        if (hit.at > 0) runs.push({ text: sentence.slice(0, hit.at) });
        runs.push({ text: sentence.slice(hit.at, end), term: hit.term });
        if (end < sentence.length) runs.push({ text: sentence.slice(end) });
      }
      return { slot: seg.slot, runs };
    }),
  }));
}

/**
 * 診斷：一句入面有幾多個**未解釋過**嘅術語（工單 AC 一）。
 *
 * ⚠ 呢個唔係渲染器修得到嘅嘢。
 *
 * 渲染器最多做到「一句只標一個」；但如果一句本身就塞咗兩個新術語，
 * 第二個就會**冇解釋噉出現喺讀者眼前** —— 而嗰個係內容嘅問題，
 * 唔係版式嘅問題。所以呢度唔靜靜咁揀一個標，而係數出嚟。
 */
export function unexplainedPairs(
  chapters: ChapterInput[],
): { palace: string; sentence: string; terms: string[] }[] {
  const terms = termIndex();
  const used = new Set<string>();
  const out: { palace: string; sentence: string; terms: string[] }[] = [];

  for (const ch of chapters) {
    for (const seg of ch.segments) {
      for (const sentence of sentences(seg.text)) {
        const fresh: string[] = [];
        for (let i = 0; i < sentence.length; i++) {
          for (const term of terms) {
            if (used.has(term.id) || fresh.includes(term.slug)) continue;
            if (sentence.startsWith(term.match, i)) {
              fresh.push(term.slug);
              break;
            }
          }
        }
        if (fresh.length > 1) out.push({ palace: ch.palace, sentence, terms: fresh });
        for (const slug of fresh) {
          const t = terms.find((x) => x.slug === slug);
          if (t) used.add(t.id);
        }
      }
    }
  }
  return out;
}
