import { MARK } from '@/lib/site';
import { LEGAL_VERSION } from '@/lib/legal';

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
  /**
   * 每一段嘅格名（開場、結構、牽動⋯），同 `body` 用 `

` 切出嚟嘅段一一對應。
   * 讀嗰陣靠佢分段、左頁命盤靠佢跟住亮（`lib/suidu.ts` `paragraphs()`）。
   * DB 嗰邊 0006 一早預留咗 `chapters.slots`，但到 2026-09 之前一直冇傳過去。
   */
  slots: string[];
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
  /** 同意咗邊個版本嘅條款及私隱政策（`lib/legal.ts`）。DB 冇佢就唔成書（0011）。 */
  termsVersion: string;
};

/**
 * ⚠ 免費章嘅名單喺架構 §6，唔喺呢度發明。
 *
 * §6：「免費（基本書）：序·你的命盤 / 命宮 / 身宮與五行局 /
 * 三方四正 / 性格的骨架」。
 *
 * 五章齊晒（2026-09）：三方四正、性格的骨架等到 B5 本書（王亭之《深造講義》
 * 六十星系）先寫得 —— 之前唔准喺冇來源之下自己砌。
 *
 * ⚠ 呢張表係**名單**，唔係章序。章序喺 `mingshu.ts` `bookChapters()`。
 */
export const FREE_SLUGS: readonly string[] = ['序', '命宮', '身宮與五行局', '三方四正', '性格的骨架'];

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

/**
 * 唔填名嘅書（2026-09，Issac）：名可以留空，留空就寫「無名」，本書叫「無名命書」。
 *
 * 「無名」係寫落本書嘅字（同出生地「香港」一樣），唔跟讀者語言轉。
 * DB 嗰條 CHECK（名 1–40 字）唔使改 —— 寫落去嘅永遠係一個名。
 */
export const NAMELESS = '無名';

export function nameOf(raw: string): string {
  return raw.trim() || NAMELESS;
}

/** 本書叫乜。同封面上面嗰兩行一樣（E5）—— 唔好兩個地方各有各叫法。 */
export function bookTitle(name: string): string {
  return `${name}命書`;
}

/** 一章嘅來源：逐宮章唔自己起名（要數序），序自己帶名。 */
export type ChapterSource = {
  slug: string;
  title?: string;
  /** 段同段之間用 `

` 分開。 */
  text: string;
  /** 每一段嘅格名，數目要同 `text` 嘅段數一樣。 */
  slots?: readonly string[];
};

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
    slots: [...(c.slots ?? [])],
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
  termsVersion: string;
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
    termsVersion: input.termsVersion,
  };
}

export type ChengshuPort = {
  /** 寫低一本書，回佢個 id。重送同一個 token 回返同一本。 */
  create(draft: BookDraft): Promise<string>;
};

/**
 * 成書之前，個 session 點處理（2026-09 修）
 *
 * - 冇 session → 開一個匿名 session（`readers` 由 auth trigger 生）
 * - 有 session、有 `readers` 行 → 照用
 * - 有 session、**冇** `readers` 行 → 登出，再開一個新嘅匿名 session
 *
 * 第三種係之前本書靜靜雞寫唔入 DB 嘅原因：`create_book` 寫 subjects 嗰下
 * 撞 foreign key（reader_id 指住一個唔存在嘅讀者）。會出現嘅情況有兩個：
 * trigger 未有之前開嘅舊 auth user；或者「刪除」做咗一半 ——
 * 資料刪晒，auth 帳戶刪唔切（見 lib/account.ts `partial`），個 session 仲喺度。
 *
 * ⚠ 唔好幫佢補返一行 `readers`：刪咗一半嗰個係讀者自己要刪嘅帳戶，
 * 補返就等於復活咗佢。換一個新匿名 session 冇嘢會唔見 ——
 * 冇 `readers` 行，就唔可能有書（所有嘢都掛喺 readers 下面）。
 */
export type SessionPlan = 'use' | 'sign-in' | 'replace';

export function sessionPlan(hasUser: boolean, hasReader: boolean): SessionPlan {
  if (!hasUser) return 'sign-in';
  return hasReader ? 'use' : 'replace';
}

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
  } catch (error) {
    /*
     * 照舊回 null（唔扮寫到），但要留低原因：之前呢度靜靜雞吞咗錯誤，
     * 本書寫唔入 DB 嗰陣連 log 都冇 —— 撞到 session 同 readers 對唔上都查唔到。
     */
    console.error('[chengshu] 寫唔入本書', error);
    return null;
  }
}

/**
 * ⚠ server action 係一個公開 HTTP endpoint（E4 嗰課）。
 *
 * `parseCastRequest()` 核排盤嗰幾格；呢度核成書多出嗰兩格。
 * 名嘅長度同 DB 嗰條 CHECK 對齊（1–40）—— 唔對齊嘅話，
 * 個人會行完五步、排完盤、入咗題名，然後先至喺寫入嗰下仆街。
 * 留空唔係錯：寫「無名」（`NAMELESS`）。
 */
export function parseBookFields(raw: unknown): { name: string; token: string; terms: string } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (r.name !== undefined && typeof r.name !== 'string') return null;
  const name = nameOf(typeof r.name === 'string' ? r.name : '');
  if (name.length > 40) return null;

  const token = typeof r.token === 'string' ? r.token : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;

  /*
   * 條款及私隱政策（2026-09-29）：一定要係而家嗰個版本。
   * 舊版本（彈窗之後條款改過）或者冇 —— 唔收生辰，返去再同意一次。
   */
  if (r.terms !== LEGAL_VERSION) return null;

  return { name, token, terms: LEGAL_VERSION };
}
