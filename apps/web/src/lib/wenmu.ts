import { citation, citeOf } from '@guanwei/content';
import { englishChapters, isEnglish } from '@/lib/english';
import { isJapanese, japaneseChapters } from '@/lib/japanese';
import { zhFor } from '@/lib/hans';
import type { ChapterLead } from '@/lib/juan-view';
import { readingOf } from '@/lib/chapter-reading';
import { internationalMing } from '@/lib/ming-international';

/**
 * 目次問目「你想知甚麼」（2026-10-14）
 *
 * 讀者入嚟問嘅係「我財運點」「我感情點」，唔係「財帛宮講乜」（競品拆解：
 * docs/compare-three-way-1990-05-15.md）。所以目次頂加六題，每題答案**直接攞該章第一段**，
 * 再跟一句《…》引文。免費命宮可另接已存檔的首段展開；不另外作判斷。
 *
 * ⚠ 問題同副題係介面文案：`messages` 嘅 `book.asks.q.<key>`。呢度淨係記邊題對邊章。
 * ⚠ 未買嘅深度章都出第一段：Issac 2026-10-14 拍板；DB 只開第一段（0008 `chapter_leads()`）。
 */
export const ASKS = [
  { key: 'ming', slug: '命宮' },
  { key: 'guan', slug: '官祿' },
  { key: 'cai', slug: '財帛' },
  { key: 'fu', slug: '夫妻' },
  { key: 'ji', slug: '疾厄' },
  { key: 'nian', slug: '這一年' },
] as const;

export type AskKey = (typeof ASKS)[number]['key'];

export type AskItem = {
  key: AskKey;
  slug: string;
  /** 該章第一段（已按 locale 轉好） */
  answer: string;
  /** 免費命宮：從已存檔的展開稿取一小段，原句保留。 */
  detail?: string;
  /** 第一句《…》引文；英文版唔出（引文喺譯文入面已經變咗講法，抽唔返原句） */
  quote: string | null;
  /** 第一段嘅出處註（2026-10-18 · A2）：同閱讀頁「據」一樣嘅書名、頁、節；冇就空 */
  sources: AskSource[];
};

export type AskSource = { id: string; book: string; page: number; section: string; pageConvention?: 'pdf' };

/** 只合併讀者眼前相同的出處；原始 sources 和逐句引用 ID 不動。 */
export function visibleSources(sources: readonly AskSource[]): AskSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = JSON.stringify([s.book, s.section, s.pageConvention ?? '', s.pageConvention === 'pdf' ? null : s.page]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 讀者見到嘅第一段：拎走粗體記號，唔要空白答案 */
function clean(s: string): string {
  return s.replace(/\*\*/g, '').trim();
}

/**
 * 第一段嘅出處（2026-10-18 · docs/leads-audit-2026-10-17.md A2 第二步）。
 *
 * 一律用中文原段配（`citeOf` 嘅中文索引最齊；出處係同一段原文，同讀者用乜語言無關），
 * 再按 locale 寫書名同節名 —— 同 `mingshu.ts` `citesFor()` 一樣嘅寫法。
 */
function sourcesOf(lead: string, locale: string, citations?: string[]): AskSource[] {
  const sentences = lead.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [];
  const ids = [...new Set(citations ?? sentences.flatMap((s) => citeOf(s.trim()) ?? []))];
  return ids.flatMap((id) => {
    const c = citation(id);
    if (!c) return [];
    const book = isEnglish(locale) ? `${c.authorEn}, ${c.bookEn} (${c.book})` : isJapanese(locale) ? `${c.author}『${c.book.replace('斗數', '斗数')}』` : zhFor(locale, `${c.author}《${c.book}》`);
    const section = isJapanese(locale) || isEnglish(locale) ? c.section : zhFor(locale, c.section);
    return [{ id, book, page: c.page, section, ...(c.pageConvention ? { pageConvention: c.pageConvention } : {}) }];
  });
}

/**
 * 由每章第一段砌出問目。冇嗰章（例如待時辰嘅書）就跳過嗰題；一題都冇就回空陣列。
 *
 * 英文：用同一個 `englishChapters()` 逐章譯第一段（同閱讀頁一樣嘅譯法）。
 */
export function buildAsks(leads: readonly ChapterLead[], locale: string): AskItem[] {
  const international = isEnglish(locale) || isJapanese(locale);
  const bySlug = new Map(leads.map((l) => [l.slug, international && l.internationalLead !== undefined
    ? { ...l, lead: l.internationalLead, citations: undefined } : l]));
  const picked = ASKS.flatMap((a) => {
    const l = bySlug.get(a.slug);
    return l && clean(l.lead) !== '' ? [{ ...a, lead: l }] : [];
  });
  if (picked.length === 0) return [];

  if (isEnglish(locale)) {
    const en = englishChapters(picked.map((p) => ({ text: clean(p.lead.lead), slots: [] })));
    return picked.map((p, i) => {
      const local = p.lead.localized?.en;
      return { key: p.key, slug: p.slug, answer: local?.answer ?? en[i]?.[0]?.text ?? '', ...(local?.detail ? { detail: local.detail } : {}), quote: null, sources: sourcesOf(clean(p.lead.lead), locale, local?.citations) };
    });
  }
  /* 日文（2026-10-15）：同閱讀頁一樣逐句譯；引文係中文原句，唔出 */
  if (isJapanese(locale)) {
    const ja = japaneseChapters(picked.map((p) => ({ text: clean(p.lead.lead), slots: [] })));
    return picked.map((p, i) => {
      const local = p.lead.localized?.ja;
      return { key: p.key, slug: p.slug, answer: local?.answer ?? ja[i]?.[0]?.text ?? '', ...(local?.detail ? { detail: local.detail } : {}), quote: null, sources: sourcesOf(clean(p.lead.lead), locale, local?.citations) };
    });
  }
  return picked.map((p) => ({
    key: p.key,
    slug: p.slug,
    answer: zhFor(locale, clean(p.lead.lead)),
    ...(p.slug === '命宮' && p.lead.detail ? { detail: zhFor(locale, clean(p.lead.detail)) } : {}),
    quote: p.lead.quote ? zhFor(locale, p.lead.quote) : null,
    sources: sourcesOf(clean(p.lead.lead), locale, p.lead.citations),
  }));
}

/**
 * 第一句引文：「《全書》寫「…」」，或者「另有一句」「記」「形容其人」呢類引出語（2026-10-18 · A4）。
 * 引出語最多十二字、唔准有標點，唔會跨句。同 0009 `chapter_leads()` 嘅 SQL 一樣，兩邊要一齊改。
 */
export const QUOTE_RE = /《[^》]+》[^「」。，；：！？、\n]{0,12}「[^」]+」/;

/** 只讀免費命宮的成書快照；舊書或資料錯配不重算，也不擴大深度章預覽。 */
export function withMingDetail(leads: readonly ChapterLead[], chapter: { text: string | null; reading?: unknown } | null): ChapterLead[] {
  const r = chapter?.text ? readingOf(chapter.reading, chapter.text) : null;
  const first = r?.segments[0];
  const detail = r?.segments[1];
  if (!first || detail?.slot !== '展開') return [...leads];
  const localized: ChapterLead['localized'] = {};
  for (const locale of ['en', 'ja'] as const) {
    const segments = internationalMing({ text: chapter!.text!, reading: chapter!.reading }, locale);
    if (segments?.[0]) localized[locale] = { answer: segments[0].text, ...(segments[1] ? { detail: segments[1].text } : {}),
      citations: [...new Set(segments.slice(0, 2).flatMap((s) => s.statements?.flatMap((l) => l.citations) ?? []))] };
  }
  return leads.map((l) => l.slug === '命宮' && l.lead === first.text ? {
    ...l,
    detail: detail.text,
    ...(Object.keys(localized).length ? { localized } : {}),
    citations: [...new Set([...(l.citations ?? first.statements?.flatMap((s) => s.citations) ?? []),
      ...(detail.statements?.flatMap((s) => s.citations) ?? [])])],
  } : l);
}

/** 示範書：由正文切第一段、第一句引文，免費命宮另取存檔展開段。 */
export function leadsFromBodies(drafts: readonly { slug: string; body: string; reading?: unknown }[]): ChapterLead[] {
  return drafts.flatMap((d) => {
    const r = readingOf(d.reading, d.body);
    const lead = {
      slug: d.slug,
      lead: d.body.split('\n\n')[0] ?? '',
      quote: d.body.match(QUOTE_RE)?.[0] ?? null,
      ...(r ? { internationalLead: r.international.text.split('\n\n')[0] ?? '', citations: [...new Set(r.segments[0]?.statements?.flatMap((l) => l.citations) ?? [])] } : {}),
    };
    return d.slug === '命宮' ? withMingDetail([lead], { text: d.body, reading: d.reading }) : [lead];
  });
}
