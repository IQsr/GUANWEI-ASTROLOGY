import 'server-only';
import {
  RULE_REGISTRY,
  SPEC_VERSION,
  assembleAll,
  inferAll,
  shenChapter,
  xuChapter,
  LEXICON,
  type Chapter,
} from '@guanwei/content';
import { SCHOOL_PROFILE, annual, cast } from '@guanwei/ziwei';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { hrefOf, slugOf } from '@/lib/lexicon';
import { markBook, type MarkedChapter } from '@/lib/zhu';
import type { Note } from '@/components/Juan';

/**
 * 由一張盤砌一本命書（工單 F1）
 *
 * ⚠ **只喺 server 行。** 推理器（C8）、組裝器（C8b）同規則庫
 * 加埋係幾百 KB 嘅資料 —— 同排盤引擎一樣，唔可以落 client bundle
 * （架構 §9 · E4 修咗嗰個窿）。
 *
 * Client 收到嘅係**已經砌好、已經標好註**嘅段落，同埋呢幾章真係用到
 * 嗰幾條註。成個詞條庫（兩萬幾字）唔會跟住走。
 */

export type Juan = {
  chapters: Chapter[];
  marked: MarkedChapter[];
  notes: Record<string, Note>;
  /** ⚠ F2 要：右側細命盤跟捲動高亮，要有個盤先跟得到。 */
  chart: ZChart;
};

/**
 * ⚠ 目錄嘅次序唔係盤面嘅次序。
 *
 * `assembleAll()` 跟住 `chart.palaces` 行，而嗰個次序係**地支次序**
 * （由寅或者子起計），所以邊一宮排第一，係睇你幾時出世。
 * 樣板第一次跑出嚟，十二章嘅第一章係「夫妻」。
 *
 * 但一本書嘅目錄要永遠一樣：命宮行先，然後順住十二宮行落去。
 * 而且呢個次序唔止影響目錄 —— **註層「全書只標一次」係跟章次序算嘅**，
 * 所以次序一亂，同一個人排兩次書，術語會標喺唔同嘅章度。
 */
export const PALACE_ORDER = [
  '命宮',
  '兄弟',
  '夫妻',
  '子女',
  '財帛',
  '疾厄',
  '遷移',
  '僕役',
  '官祿',
  '田宅',
  '福德',
  '父母',
] as const;

export function inReadingOrder(chapters: Chapter[]): Chapter[] {
  const rank = (name: string) => {
    const i = PALACE_ORDER.indexOf(name as (typeof PALACE_ORDER)[number]);
    return i === -1 ? PALACE_ORDER.length : i;
  };
  return [...chapters].sort((a, b) => rank(a.palace) - rank(b.palace));
}

/** 目錄：章名 ＋ 去邊。 */
export function contents(chapters: Chapter[]): { palace: string; slug: string }[] {
  return inReadingOrder(chapters).map((c) => ({ palace: c.palace, slug: c.palace }));
}

/** 呢幾章用到嘅註 —— 唔係成個詞條庫。 */
export function notesFor(marked: MarkedChapter[]): Record<string, Note> {
  const ids = new Set(
    marked.flatMap((c) => c.segments.flatMap((s) => s.runs.map((r) => r.term?.id))).filter(Boolean),
  );
  const out: Record<string, Note> = {};
  for (const entry of LEXICON) {
    if (!ids.has(entry.id)) continue;
    out[entry.id] = {
      id: entry.id,
      term: slugOf(entry),
      summary: entry.summary,
      href: hrefOf(entry),
    };
  }
  return out;
}

export function buildJuan(raw: Chapter[], chart: ZChart): Juan {
  /* ⚠ 先排好次序先標註 —— 標註跟章次序算（見上面）。 */
  const chapters = inReadingOrder(raw);
  const marked = markBook(
    chapters.map((c) => ({
      palace: c.palace,
      segments: c.segments.map((s) => ({ slot: s.slot, text: s.text })),
    })),
  );
  return { chapters, marked, notes: notesFor(marked), chart };
}

/**
 * 由一張盤砌十二章正文（工單 G5）。
 *
 * ⚠ `seed` 唔係一個裝飾。C8b 個組裝器要可重現：同一張盤、同一個 seed
 * 一定要砌出一模一樣嘅字。成書嗰陣用**本書個 token** 做 seed ——
 * 即係話萬一要重生成，出返嚟嘅係同一本書，唔係另一本。
 *
 * ⚠ `year` 會入到正文度（流年層）。所以一本書幾時成，影響入面啲字 ——
 * 而嗰啲字**寫咗落 DB 就唔會再變**（架構 §5）。呢個係啱嘅：
 * 一本書唔應該喺你唔知嘅情況下自己改咗內容。
 */
export function chaptersOf(
  chart: ZChart,
  opts: { seed: string; year: number },
): Chapter[] | null {
  const a = annual(chart, opts.year);
  if (!a.ok) return null;

  const byTopic = inferAll(
    RULE_REGISTRY,
    { chart, annual: a.value },
    SCHOOL_PROFILE.ref,
    SPEC_VERSION,
    { chartId: opts.seed, layer: 'natal' },
  );

  return inReadingOrder(assembleAll(chart, byTopic, { seed: opts.seed }));
}

/**
 * 一本書由邊幾章砌成（工單 C12）。
 *
 * ⚠ 序行先，而且佢唔係一個逐宮章。
 *
 * 架構 §6 個免費名單第一項就係「序·你的命盤」。佢冇來源、亦都唔使 ——
 * 佢對斗數冇作出任何主張，佢係版權頁：寫你嘅生辰點樣變成呢張盤、
 * 用咗邊套規矩（內容 §2「揀咗要公開講」· 架構 §8「版權頁寫明用咗乜」）。
 *
 * 到 C12 之前，全站**冇一個地方**兌現過嗰兩句。
 */
export function bookChapters(
  chart: ZChart,
  opts: { seed: string; year: number; solar: { y: number; m: number; d: number }; place: string },
): { slug: string; title?: string; text: string }[] | null {
  const palaces = chaptersOf(chart, { seed: opts.seed, year: opts.year });
  if (!palaces) return null;

  const join = (segments: { text: string }[]) => segments.map((s) => s.text).join('\n\n');

  /*
   * ⚠ 流派聲明由引擎出（H2 第一條 AC：三處同源，唔准人手抄）。
   * ⚠ 規則庫版本由規則庫自己出（B16 第二條 AC）——
   *   寫死一個字串，就會出現「版權頁講緊 v1，實際跑緊 v2」。
   */
  const xu = xuChapter({
    chart,
    solar: opts.solar,
    place: opts.place,
    declaration: SCHOOL_PROFILE.declaration,
    contentVersion: RULE_REGISTRY.ref,
  });
  const shen = shenChapter({ chart });

  /*
   * ⚠ 次序：序 → 命宮 → 身宮與五行局 → 其餘十一宮。
   *
   * 免費章行先（架構 §6），而身宮嗰章擺喺命宮後面 ——
   * 佢講嘅係「後天著力喺邊」，讀完「先天基調」先至讀得通。
   */
  const [ming, ...rest] = palaces;

  return [
    { slug: xu.slug, title: xu.title, text: join(xu.segments) },
    ...(ming ? [{ slug: ming.palace, text: ming.text }] : []),
    ...(shen ? [{ slug: shen.slug, title: shen.title, text: join(shen.segments) }] : []),
    ...rest.map((c) => ({ slug: c.palace, text: c.text })),
  ];
}

/**
 * 樣板用嘅一本書。同 `/tokens` 同一個生辰 —— 唔係任何人嘅真資料。
 *
 * ⚠ 呢一步就係「命書內容存返落 DB」嗰件事嘅反面：
 * 架構 §5 寫住「命書內容存返落 DB，唔好每次即時生成 ——
 * 『一本書』嘅承諾包括『佢唔會自己變』」。
 * 呢度即時砌係因為佢係**樣板**；真書由 `chapters` 嗰張表讀返（G5）。
 */
export function demoJuan(): Juan | null {
  const r = cast({
    solar: { y: 1996, m: 6, d: 16 },
    time: { h: 8, min: 30 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'male',
  });
  if (!r.ok) return null;

  const chapters = chaptersOf(r.value, { seed: 'demo', year: 2026 });
  return chapters ? buildJuan(chapters, r.value) : null;
}
