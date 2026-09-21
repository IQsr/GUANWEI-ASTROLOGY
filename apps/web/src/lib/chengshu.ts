import { MARK } from '@/lib/site';

/**
 * 成書：六幕行完之後留低嘅嘢（工單 G5 · 架構 §5）
 *
 * ── 呢個檔補緊一個好大嘅窿 ──
 *
 * E4 寫生辰、E5 題名、E6 展卷 —— 六幕由頭行到尾，行完之後
 * **一個字都冇留低**。本書淨係活喺 React state 度：撳一下重新整理
 * 就冇咗，書架永遠係空，`/book/[id]` 永遠撈唔到嘢。
 *
 * 架構 §5：「命書內容存返落 DB，唔好每次即時生成 ——
 * 『一本書』嘅承諾包括『佢唔會自己變』。」
 *
 * ── 點解真正嘅寫入唔喺呢度 ──
 *
 * 寫入係一句 `create_book()`（migration 0005），而**嗰句 SQL 喺
 * PGlite 連 RLS 一齊跑過**（`packages/db/test/chengshu.test.ts`，18 條）。
 * 呢個檔只做決定：邊幾章免費、章名點寫、本書叫乜。
 * Adapter（`chengshu.server.ts`）零判斷。
 */

export type Tier = 'free' | 'deep';

export type ChapterDraft = {
  slug: string;
  ord: number;
  tier: Tier;
  title: string;
  body: string;
  content_version: string;
};

export type SubjectDraft = {
  name: string;
  birth_date: string;
  /** null = 唔知時辰（架構 §8）。 */
  birth_time: string | null;
  birth_tz: string;
  birth_place: string;
  lng: number;
  lat: number;
  sex: 'male' | 'female';
  true_solar_corrected: boolean;
};

export type ChartDraft = {
  engine_version: string;
  school_profile_id: string;
  payload: unknown;
};

export type BookDraft = {
  token: string;
  subject: SubjectDraft;
  /** null = 待時辰：有生辰、冇盤、冇名、冇章。 */
  chart: ChartDraft | null;
  title: string | null;
  seal: string | null;
  chapters: ChapterDraft[];
};

/**
 * ⚠ 免費章嘅名單喺架構 §6，唔喺呢度發明。
 *
 * §6：「免費（基本書）：序·你的命盤 / 命宮 / 身宮與五行局 /
 * 三方四正 / 性格的骨架」。
 *
 * 五章入面而家生成得到三章：**序**、**命宮**、**身宮與五行局**。
 *
 * 餘下兩章（三方四正、性格的骨架）行乙案（Issac 2026-09-20）：
 * 佢哋要**新嘅 L3 塊**，而新塊要有來源 —— 即係要等 B5 本書。
 * 唔係實作做唔到，係唔准喺冇來源之下自己砌。
 *
 * 呢個唔係一個定價決定，係一個**未做完**。寫落呢度，
 * 免得有人由 code 度讀出「我哋決定咗免費只得三章」。
 */
export const FREE_SLUGS: readonly string[] = ['序', '命宮', '身宮與五行局'];

export function tierOf(slug: string): Tier {
  return FREE_SLUGS.includes(slug) ? 'free' : 'deep';
}

const CHINESE_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

/** 章序用中文數字：一 · 命宮。十二章，所以只需要去到十二。 */
export function chapterNumeral(n: number): string {
  if (n < 10) return CHINESE_DIGITS[n]!;
  if (n < 20) return `十${n % 10 ? CHINESE_DIGITS[n % 10] : ''}`;
  return `${CHINESE_DIGITS[Math.floor(n / 10)]}十${n % 10 ? CHINESE_DIGITS[n % 10] : ''}`;
}

/** 本書叫乜。同封面上面嗰兩行一樣（E5）—— 唔好兩個地方各有各叫法。 */
export function bookTitle(name: string): string {
  return `${name}命書`;
}

/** 一章嘅來源：逐宮章唔自己起名（要數序），序自己帶名。 */
export type ChapterSource = { slug: string; title?: string; text: string };

/**
 * ⚠ 章嘅 slug 用中文，同藏經閣同一個理由（D1）：
 * 拼音方案有好幾套，揀邊套都係一個要解釋嘅決定；中文字冇呢個問題。
 * 而且 F1 個 `contents()` 一直都係噉，改咗即刻兩套路由。
 *
 * ⚠ 序唔跟號。「序 · 一」讀落唔係一本書 —— 序就係序，
 * 數字由佢後面第一章起。所以自己帶名嗰啲唔入數。
 */
export function chapterDrafts(
  chapters: ChapterSource[],
  contentVersion: string,
): ChapterDraft[] {
  let numbered = 0;
  return chapters.map((c, i) => ({
    slug: c.slug,
    ord: i + 1,
    tier: tierOf(c.slug),
    title: c.title ?? `${chapterNumeral(++numbered)} · ${c.slug}`,
    body: c.text,
    content_version: contentVersion,
  }));
}

export type ChengshuInput = {
  token: string;
  name: string;
  subject: Omit<SubjectDraft, 'name'>;
  chart: ChartDraft | null;
  chapters: ChapterSource[];
  contentVersion: string;
};

/**
 * ⚠ 有盤先有名（`books_titled_with_chart`）。
 *
 * 待時辰嗰本書**唔止係冇名**，佢係冇名、冇印、冇章 ——
 * 因為「唔好扮有」（架構 §8）：一本排唔到盤嘅書唔應該有封面。
 */
export function bookDraft(input: ChengshuInput): BookDraft {
  const titled = input.chart !== null;
  return {
    token: input.token,
    subject: { ...input.subject, name: input.name.trim() },
    chart: input.chart,
    title: titled ? bookTitle(input.name.trim()) : null,
    seal: titled ? MARK : null,
    chapters: titled ? chapterDrafts(input.chapters, input.contentVersion) : [],
  };
}

export type ChengshuPort = {
  /** 寫低一本書，回佢個 id。重送同一個 token 回返同一本。 */
  create(draft: BookDraft): Promise<string>;
};

/**
 * ⚠ 寫唔到**唔可以擋住六幕**。
 *
 * 呢一刻個人啱啱寫完五步生辰，個盤已經排好咗。如果因為 DB 接唔上
 * 就出一版錯誤頁，佢損失嘅係嗰一下 —— 而嗰一下係成個產品最貴嗰一下。
 *
 * 所以寫唔到就回 `null`：題名照行、展卷照行，只係**冇書齋入口**。
 * 呢個係「唔好扮有」嘅另一面：唔准講「已收入書齋」，
 * 但都唔准因為收唔到就當冇排過盤。
 */
export async function keepBook(port: ChengshuPort, draft: BookDraft): Promise<string | null> {
  try {
    return await port.create(draft);
  } catch {
    return null;
  }
}

/**
 * ⚠ server action 係一個公開 HTTP endpoint（E4 嗰課）。
 *
 * `parseCastRequest()` 核排盤嗰幾格；呢度核成書多出嗰兩格。
 * 名嘅長度同 DB 嗰條 CHECK 對齊（1–40）—— 唔對齊嘅話，
 * 個人會行完五步、排完盤、入咗題名，然後先至喺寫入嗰下仆街。
 */
export function parseBookFields(raw: unknown): { name: string; token: string } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (name.length < 1 || name.length > 40) return null;

  const token = typeof r.token === 'string' ? r.token : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;

  return { name, token };
}
