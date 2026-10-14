import { englishChapters, isEnglish } from '@/lib/english';
import { zhFor } from '@/lib/hans';
import type { ChapterLead } from '@/lib/juan-view';

/**
 * 目次問目「你想知甚麼」（2026-10-14）
 *
 * 讀者入嚟問嘅係「我財運點」「我感情點」，唔係「財帛宮講乜」（競品拆解：
 * docs/compare-three-way-1990-05-15.md）。所以目次頂加六題，每題答案**直接攞該章第一段**，
 * 再跟一句《…》引文 —— 唔另外寫、冇分數、冇吉凶標籤。想知點解，入章讀。
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
  /** 第一句《…》引文；英文版唔出（引文喺譯文入面已經變咗講法，抽唔返原句） */
  quote: string | null;
};

/** 讀者見到嘅第一段：拎走粗體記號，唔要空白答案 */
function clean(s: string): string {
  return s.replace(/\*\*/g, '').trim();
}

/**
 * 由每章第一段砌出問目。冇嗰章（例如待時辰嘅書）就跳過嗰題；一題都冇就回空陣列。
 *
 * 英文：用同一個 `englishChapters()` 逐章譯第一段（同閱讀頁一樣嘅譯法）。
 */
export function buildAsks(leads: readonly ChapterLead[], locale: string): AskItem[] {
  const bySlug = new Map(leads.map((l) => [l.slug, l]));
  const picked = ASKS.flatMap((a) => {
    const l = bySlug.get(a.slug);
    return l && clean(l.lead) !== '' ? [{ ...a, lead: l }] : [];
  });
  if (picked.length === 0) return [];

  if (isEnglish(locale)) {
    const en = englishChapters(picked.map((p) => ({ text: clean(p.lead.lead), slots: [] })));
    return picked.map((p, i) => ({ key: p.key, slug: p.slug, answer: en[i]?.[0]?.text ?? '', quote: null }));
  }
  return picked.map((p) => ({
    key: p.key,
    slug: p.slug,
    answer: zhFor(locale, clean(p.lead.lead)),
    quote: p.lead.quote ? zhFor(locale, p.lead.quote) : null,
  }));
}

/** 示範書：成本書喺 build 嗰陣計好，直接由正文切第一段同第一句引文（同 0008 嘅 SQL 一樣切法） */
export function leadsFromBodies(drafts: readonly { slug: string; body: string }[]): ChapterLead[] {
  return drafts.map((d) => ({
    slug: d.slug,
    lead: d.body.split('\n\n')[0] ?? '',
    quote: d.body.match(/《[^》]+》寫「[^」]+」/)?.[0] ?? null,
  }));
}
