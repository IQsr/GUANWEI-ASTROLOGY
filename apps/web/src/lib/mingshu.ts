import {lifeStepsReading} from './life-steps-reading';
import 'server-only';
import {withCrossPalaceReading,analyzeCrossPalaces} from '@/lib/cross-palace-chapters';
import {
  citation,
  RULE_REGISTRY,
  SPEC_VERSION,
  assembleAll,
  inferAll,
  shenChapter,
  gujiaChapter,
  lifeStepsChapter,
  decadeChapter,
  yearChapter,
  epilogueChapter,
  xuChapter,
  isYoungReader,
  isYouthReader,
  youthPass,
  freeMingReading,
  palaceReading,
  withPalaceAdvice,
  palaceNarrative,
  readerReferenceLanguage,
  LEXICON,
  type Chapter,
} from '@guanwei/content';
import { SCHOOL_PROFILE, annual, cast } from '@guanwei/ziwei';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { hrefOf, slugOf, textOf } from '@/lib/lexicon';
import { markBook, type MarkedChapter } from '@/lib/zhu';
import { hans, isHans, zhFor } from '@/lib/hans';
import type { CiteNote, Note } from '@/components/Juan';
import type { ChapterReading } from '@/lib/chapter-reading';
import { localizedMing } from '@/lib/ming-international';

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
/** `locale`：英文閱讀模式用英文名同摘要（詞條 LEXICON_EN） */
export function notesFor(marked: MarkedChapter[], locale = 'zh-Hant'): Record<string, Note> {
  const ids = new Set(
    marked.flatMap((c) => c.segments.flatMap((s) => s.runs.map((r) => r.term?.id))).filter(Boolean),
  );
  const out: Record<string, Note> = {};
  for (const entry of LEXICON) {
    if (!ids.has(entry.id)) continue;
    const text = textOf(entry, locale);
    out[entry.id] = {
      id: entry.id,
      term: locale === 'en' ? text.label : zhFor(locale, slugOf(entry)),
      summary: text.summary,
      href: hrefOf(entry),
    };
  }
  return out;
}

/**
 * 呢幾章用到嘅出處（2026-10-12）：書名、頁、節、原文。
 * 原文照錄（PDF 本係簡體）；節名跟讀者語言（簡體版轉簡體）。英文讀者見英文書名，原文照中文。
 */
export function citesFor(marked: MarkedChapter[], locale = 'zh-Hant'): Record<string, CiteNote> {
  const ids = new Set(marked.flatMap((c) => c.segments.flatMap((s) => s.runs.flatMap((r) => r.cite ?? []))));
  const out: Record<string, CiteNote> = {};
  for (const id of ids) {
    const c = citation(id);
    if (!c) continue;
    out[id] = {
      id,
      book: locale === 'en' ? `${c.authorEn}, ${c.bookEn} (${c.book})` : locale === 'ja' ? `${c.author}『${c.book.replace('斗數', '斗数')}』` : zhFor(locale, `${c.author}《${c.book}》`),
      page: c.page,
      section: zhFor(locale, readerReferenceLanguage(c.section)),
      text: c.text,
      ...(c.quoteParts ? {quoteParts:c.quoteParts.map((part) => ({...part,...(part.note ? {note:zhFor(locale,part.note)} : {})}))} : {}),
      ...(c.pageEnd ? { pageEnd: c.pageEnd } : {}),
      ...(c.sourceNote ? { sourceNote: zhFor(locale, readerReferenceLanguage(c.sourceNote)) } : {}),
      ...(c.pageConvention ? { pageConvention: c.pageConvention } : {}),
      ...(c.excerpt ? { excerpt: true } : {}),
    };
  }
  return out;
}

/**
 * 簡體（2026-10-08）：術語要用繁體標（詞條係繁體），標完先將每段字轉做簡體。
 * `term`（連去邊個詞條）照留 —— 佢係資料，唔係畀人睇嘅字。
 */
export function localizeMarked(marked: MarkedChapter[], locale: string): MarkedChapter[] {
  if (!isHans(locale)) return marked;
  return marked.map((c) => ({
    ...c,
    segments: c.segments.map((s) => ({ ...s, ...(s.heading ? { heading: hans(s.heading) } : {}),
      ...(s.referenceConditions ? { referenceConditions: s.referenceConditions.map(hans) } : {}),
      ...(s.referenceApplicability ? { referenceApplicability: s.referenceApplicability.map(hans) } : {}),
      runs: s.runs.map((r) => ({ ...r, text: hans(r.text) })) })),
  }));
}

export function buildJuan(raw: Chapter[], chart: ZChart): Juan {
  /* ⚠ 先排好次序先標註 —— 標註跟章次序算（見上面）。 */
  const chapters = inReadingOrder(raw);
  const marked = markBook(
    chapters.map((c) => ({
      palace: c.palace,
      segments: c.segments.map((s) => ({ slot: s.slot, text: s.text, statements: s.statements })),
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
  opts: { seed: string; year: number; mingWriter?: 'legacy' | 'cards' },
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

  return inReadingOrder(assembleAll(chart, byTopic, { seed: opts.seed, mingWriter: opts.mingWriter ?? 'cards' }));
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
  opts: { seed: string; year: number; solar: { y: number; m: number; d: number }; place: string; crossPalaceReading?: boolean; birthSex?: 'male'|'female' },
): { slug: string; title?: string; text: string; slots: string[]; reading?: ChapterReading }[] | null {
  const palaces = chaptersOf(chart, { seed: opts.seed, year: opts.year });
  if (!palaces) return null;

  /*
   * ⚠ 每一章都要分段、帶住格名（2026-09 修）。
   *
   * 之前宮位章直接用 `c.text` —— 內容庫嗰邊係 `join('')`，冇分段 ——
   * 而 slots 從來冇寫落 DB。結果真書入面命宮等十二章每章一大段字牆，
   * 左頁命盤亦跟唔到段落。樣板頁睇落冇事，因為佢直接讀內容庫嘅段，唔經 DB。
   */
  const body = (segments: readonly { text: string; slot: string }[]) => ({
    text: segments.map((s) => s.text).join('\n\n'),
    slots: segments.map((s) => s.slot),
  });

  /* 序唔再印版本號（2026-09）：版本照舊寫落 DB（成書嗰陣，見 cast/actions.ts）。 */
  const xu = xuChapter({ chart, solar: opts.solar, place: opts.place, year: opts.year });
  const shen = shenChapter({ chart, year: opts.year });
  const gujia = gujiaChapter({ chart, year: opts.year });
  /* 大限（2026-09-30）：一生十二步免費，這十年收費；跟成書年份講 */
  const steps = lifeStepsChapter({ chart, year: opts.year, solar: opts.solar });
  const decade = decadeChapter({ chart, year: opts.year });
  /* 流年（2026-09-30）：寫書嗰年同下一年，收費 */
  const liunian = yearChapter({ chart, year: opts.year });
  /* 給你的話（2026-10-02）：書尾總結，收費 */
  const epilogue = epilogueChapter({ chart, year: opts.year });

  /*
   * ⚠ 次序：序 → 命宮 → 性格的骨架 → 身宮與五行局 → 其餘十一宮。
   *
   * 免費章行先（架構 §6）。骨架緊跟命宮：兩章都係讀命宮，
   * 由「命宮坐乜」→「呢個星系嘅本質、條軸偏向邊頭」。
   * 「三方四正」章 2026-10-07 併入骨架（見 content `xingxi-chapters.ts`）；舊書照讀。
   * 身宮嗰章擺喺後面：佢講嘅係「後天著力喺邊」，讀完「先天基調」先至讀得通。
   */
  /*
   * 年少讀者（虛歲 13 或以下，2026-10-16）：宮位章唔出最後嗰段大人生活場景
   * （同事、伴侶、投資⋯）。序有一句提醒（content `XU_YOUNG`）。
   */
  const young = isYoungReader(chart, opts.year);
  const youth = isYouthReader(chart, opts.year);
  // 成人情境及編輯建議不套在年少讀者身上；已核本命解讀仍保留。
  const ageSafe = palaces.map((c) => c.palace !== '命宮' || !youth ? c : {
    ...c, segments: c.segments.filter((s) => !s.statements?.some((l) => l.kind === 'editorial-example' || l.kind === 'editorial-advice')),
  });
  const [ming, ...rest] = (young
    ? ageSafe.map((c) => ({ ...c, segments: c.segments.filter((s) => s.slot !== '生活') }))
    : ageSafe);

  type Part = { slug: string; title?: string; segments: { slot: string; text: string; topic?: string; heading?: string; statements?: import('@guanwei/content').MingStatement[] }[] };
  const parts: Part[] = [
    { slug: xu.slug, title: xu.title, segments: xu.segments },
    ...(ming ? [{ slug: ming.palace, segments: ming.segments }] : []),
    ...(gujia ? [{ slug: gujia.slug, title: gujia.title, segments: gujia.segments }] : []),
    ...(shen ? [{ slug: shen.slug, title: shen.title, segments: shen.segments }] : []),
    ...(steps ? [{ slug: steps.slug, title: steps.title, segments: steps.segments }] : []),
    ...(decade ? [{ slug: decade.slug, title: decade.title, segments: decade.segments }] : []),
    ...(liunian ? [{ slug: liunian.slug, title: liunian.title, segments: liunian.segments }] : []),
    ...rest.map((c) => ({ slug: c.palace, segments: c.segments })),
    ...(epilogue ? [{ slug: epilogue.slug, title: epilogue.title, segments: epilogue.segments }] : []),
  ];
  /*
   * 後生讀者（虛歲二十四或以下，2026-10-18）：婚姻、子女講明係將來；這十年、這一年用讀書年代講法；
   * 骨架重嘅偏向名換輕啲（content `youthPass`）。只改呢度砌出嚟嘅字，內容庫唔郁。
   */
  const finished = isYouthReader(chart, opts.year) ? youthPass(parts) : parts;
  // 英日尚未切換；保存同一成書時刻的舊版，不在讀取時重算。
  const oldMing = chaptersOf(chart, { seed: opts.seed, year: opts.year, mingWriter: 'legacy' })?.find((c) => c.palace === '命宮');
  const oldParts: Part[] = oldMing ? [{ slug: '命宮', segments: oldMing.segments.filter((s) => !young || s.slot !== '生活') }] : [];
  const international = (youth ? youthPass(oldParts) : oldParts)[0];
  const originals = finished.map((p) => {
    if(p.slug==='一生十二步'){
      const reading=lifeStepsReading(p.segments);
      return {slug:p.slug,...(p.title?{title:p.title}:{}),...body(p.segments),reading};
    }
    if (p.slug !== '命宮' || !international) return { slug: p.slug, ...(p.title ? { title: p.title } : {}), ...body(p.segments) };
    const seen = new Set<string>();
    let evidence = false;
    const segments = p.segments.map((s) => {
      const heading = s.heading ?? (s.slot === '因為' ? (evidence ? undefined : '盤面與出處') : s.topic && !seen.has(s.topic) ? s.topic : undefined);
      if (s.slot === '因為') evidence = true;
      if (s.topic) seen.add(s.topic);
      return { ...s, ...(heading ? { heading } : {}) };
    });
    const reading: ChapterReading = { format: 'ming-expanded-v1', writer: 'sentence-backed-v1', segments, international: body(international.segments) };
    return { slug: p.slug, ...body(segments), reading: { ...reading, localized: localizedMing(reading) } };
  });
  // 六十星系繁簡閱讀稿；英日保存同一成書時刻的完整原版。
  const revised = freeMingReading(chart, opts.year);
  const cross = opts.crossPalaceReading ? analyzeCrossPalaces(chart,{birthSex:opts.birthSex}) : null;
  return originals.map((p) => {
    const isMing = p.slug === '命宮' || p.slug === '性格的骨架';
    const selected = p.slug === '命宮' ? revised?.ming : p.slug === '性格的骨架' ? revised?.bone : palaceReading(chart, p.slug, opts.year);
    if (!selected) return p;
    const baseSegments = withPalaceAdvice(chart, p.slug, opts.year, palaceNarrative(chart, p.slug, opts.year, selected));
    const segments = (cross ? withCrossPalaceReading(chart,p.slug,opts.year,baseSegments,cross) : baseSegments)
      .map((row) => ({ ...row, ...(row.referenceConditions ? { referenceConditions: row.referenceConditions.map(readerReferenceLanguage) } : {}) }));
    const internationalSnapshot = { text: p.text, slots: p.slots, ...('reading' in p && p.reading ? { reading: p.reading } : {}) };
    const reading: ChapterReading = { format: 'ming-expanded-v1', writer: isMing ? 'reader-backed-v1' : 'palace-reader-v1', segments,
      international: { text: p.text, slots: p.slots }, internationalSnapshot };
    return { ...p, ...body(segments), reading };
  });
}

/**
 * 樣板用嘅一本書。同 `/tokens` 同一個生辰 —— 唔係任何人嘅真資料。
 *
 * ⚠ 呢一步就係「命書內容存返落 DB」嗰件事嘅反面：
 * 架構 §5 寫住「命書內容存返落 DB，唔好每次即時生成 ——
 * 『一本書』嘅承諾包括『佢唔會自己變』」。
 * 呢度即時砌係因為佢係**樣板**；真書由 `chapters` 嗰張表讀返（G5）。
 */
export function demoJuan(opts: { mingWriter?: 'legacy' | 'cards' } = {}): Juan | null {
  const r = cast({
    solar: { y: 1996, m: 6, d: 16 },
    time: { h: 8, min: 30 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'male',
  });
  if (!r.ok) return null;

  const chapters = chaptersOf(r.value, { seed: 'demo', year: 2026, ...opts });
  return chapters ? buildJuan(chapters, r.value) : null;
}
