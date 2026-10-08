/**
 * 藏經閣路由（工單 D1）
 *
 * 出處：架構 §7 藏經閣、§9 索引與分享、視覺系統 §5 版
 *
 * ── 英文藏經閣（2026-10-05 開）──
 *
 * 以前只出繁中，理由係「冇英文詞條就唔好開個空殼」。而家三十五條都有英文
 * （`@guanwei/content` 嘅 LEXICON_EN），所以 `/en/lexicon/…` 開咗：
 * 名、摘要、全文用英文；出處寫英文書名、卷、篇，原文（公有領域嘅《全書》）照附。
 * slug 照用中文（同中文版同一條 URL 結構，hreflang 互指）。
 */
import { CORPUS, LEXICON, LEXICON_EN, type LexiconEntry } from '@guanwei/content';
import { hans, isHans } from '@/lib/hans';

export { LEXICON_LOCALE, LEXICON_LOCALES, isLexiconLocale } from '@/lib/lexicon-locale';

export const KINDS = ['star', 'palace', 'sihua', 'ju'] as const;
export type LexiconKind = (typeof KINDS)[number];

export function isKind(v: string): v is LexiconKind {
  return (KINDS as readonly string[]).includes(v);
}

/**
 * id `star.紫微` → slug `紫微`。
 *
 * 中文 slug 唔係為咗靚 —— 係因為讀者搜「紫微」嗰陣，
 * 一條 `/lexicon/star/紫微` 喺搜尋結果度顯示返「紫微」，
 * 而一條 `/lexicon/star/ziwei` 顯示嘅係一個我哋自己發明嘅拼法。
 * 拼音方案有好幾套，揀邊套都係一個要解釋嘅決定；中文字冇呢個問題。
 */
export function slugOf(entry: LexiconEntry): string {
  return entry.id.split('.')[1]!;
}

export function entryOf(kind: string, slug: string): LexiconEntry | null {
  /* 瀏覽器會 percent-encode 中文，Next 通常已經解碼；兩邊都食得。 */
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* 本來就唔係 encoded */
  }
  return LEXICON.find((e) => e.kind === kind && slugOf(e) === decoded) ?? null;
}

export function entriesOf(kind: LexiconKind): LexiconEntry[] {
  return LEXICON.filter((e) => e.kind === kind);
}

export function hrefOf(entry: LexiconEntry): string {
  return `/lexicon/${entry.kind}/${slugOf(entry)}`;
}

/**
 * 出街嗰條 URL —— canonical、OG url、sitemap 全部用呢個。
 *
 * ⚠ 由**詞條本身**砌，唔准由 route param 砌。
 * param 入面嗰個 slug 已經係 encode 咗嘅，再 encode 一次就變 `%25E7%25B4%25AB`，
 * 而一條指去 404 嘅 canonical 比冇 canonical 更差 ——
 * 佢主動話畀搜尋器聽「呢版嘅正本喺嗰度」，而嗰度唔存在。
 */
export function canonicalOf(entry: LexiconEntry): string {
  return `/lexicon/${entry.kind}/${encodeURIComponent(slugOf(entry))}`;
}

/**
 * 一條詞條嘅相關條目 —— **出邊同入邊嘅聯集**（工單 D2「相關條目互連」）。
 *
 * `see_also` 係人手寫嘅，所以佢係單向嘅：紫微寫住「見天府」，
 * 天府未必寫返「見紫微」。三十五條入面有 **44 條單向邊**，
 * 而且有兩條（子女宮、木三局）**一條入邊都冇**。
 *
 * 對讀者嚟講冇所謂方向：佢想知呢一條連住邊啲。
 * 但對爬蟲嚟講方向好重要 —— 一條冇入邊嘅頁，
 * 由搜尋結果入嚟之後就係一條死路，而且拎唔到站內嘅權重。
 *
 * 所以呢度**唔改資料去夾對稱** —— `see_also` 係作者嘅意思，
 * 夾硬補返轉頭會加一啲作者冇打算寫嘅關係。
 * 改為喺 render 嗰陣做聯集：作者嘅意思照留，而張圖變成雙向。
 */
export function relatedOf(entry: LexiconEntry): LexiconEntry[] {
  const out = entry.see_also
    .map((id) => LEXICON.find((e) => e.id === id))
    .filter((e): e is LexiconEntry => Boolean(e));
  const seen = new Set([entry.id, ...out.map((e) => e.id)]);
  const inbound = LEXICON.filter((e) => !seen.has(e.id) && e.see_also.includes(entry.id));
  return [...out, ...inbound];
}

/** 全部詞條頁嘅路徑。`generateStaticParams` 同 sitemap（D2）共用。 */
export function allEntryParams(): { kind: string; slug: string }[] {
  return LEXICON.map((e) => ({ kind: e.kind, slug: slugOf(e) }));
}

/**
 * 目錄頁嘅一行摘要。
 *
 * ⚠ 唔可以夾硬截 N 個字。第一版就係 `summary.slice(0, 28)`，出嚟係
 * 「紫微屬土，《全書》稱其為「中天之尊星」、帝座，主官祿。在…」——
 * 停喺一個「在」字度。讀者見到嘅唔係「摘要」，係「一句斷咗嘅說話」。
 *
 * 呢個喺 code 度睇落完全正常，要影咗相先睇得出。
 *
 * 所以做法係：**整句整句噉攞，攞到夠為止。**
 * 攞到嘅就係一句完整嘅話，唔使省略號。
 * 第一句就已經長過上限嗰啲（例如疾厄宮嗰句引文），先至退去標點截。
 */
export function teaser(summary: string, max = 34): string {
  const sentences = summary.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [summary];

  let out = '';
  for (const s of sentences) {
    if (out && out.length + s.length > max) break;
    out += s;
    if (out.length >= max) break;
  }
  if (out && out.length <= max) return out;

  /* 第一句自己都爆咗：退到最近一個標點，加省略號。 */
  const head = summary.slice(0, max);
  const cut = Math.max(...['，', '；', '、', '」', '：'].map((p) => head.lastIndexOf(p)));
  return cut > 0 ? `${head.slice(0, cut + 1)}…` : `${head}…`;
}

/* ── 英文（2026-10-05）───────────────────────────────── */

/** 詞條嘅名、摘要、全文：英文版用 LEXICON_EN，冇就退返中文。 */
export function textOf(entry: LexiconEntry, locale: string): { label: string; summary: string; full: string } {
  /* 簡體（2026-10-08）：由繁體轉 */
  if (isHans(locale)) return { label: hans(entry.label), summary: hans(entry.summary), full: hans(entry.full) };
  const en = locale === 'en' ? LEXICON_EN[entry.id] : undefined;
  if (!en) return { label: entry.label, summary: entry.summary, full: entry.full };
  /* 書名嘅 Markdown 斜體（*Complete Book*）網站顯示唔到，拎走星號 */
  const plain = (s: string) => s.replace(/\*([^*\n]+)\*/g, (_m: string, t: string) => t);
  return { label: en.label, summary: plain(en.summary), full: plain(en.full) };
}

/** 英文摘要：整句整句噉攞，攞到夠為止（同中文 `teaser()` 一樣嘅道理）。 */
export function teaserEn(summary: string, max = 200): string {
  const sentences = summary.match(/[^.?]+[.?]+(?:\s+|$)/g) ?? [summary];
  let out = '';
  for (const s of sentences) {
    if (out && out.length + s.length > max) break;
    out += s;
  }
  return out.trim();
}

export const teaserFor = (summary: string, locale: string, max?: number) =>
  locale === 'en' ? teaserEn(summary, max ? max * 4 : undefined) : teaser(summary, max);

/** 「/lexicon/star/紫微」→ 英文版前面加「/en」 */
export const localePath = (path: string, locale: string) => (locale === 'zh-Hant' ? path : `/${locale}${path}`);

/** hreflang：同一條路三種語言（繁體冇前綴） */
export const lexiconAlternates = (path: string) => ({
  'zh-Hant': path,
  'zh-Hans': localePath(path, 'zh-Hans'),
  en: localePath(path, 'en'),
});

const BOOK_EN: Record<string, string> = {
  quanshu: 'Complete Book of Zi Wei Dou Shu',
  zhongzhou: 'Wang Tingzhi, Advanced Lectures on Zi Wei Dou Shu (Zhongzhou School)',
};
export const bookEn = (corpus: string) => BOOK_EN[corpus] ?? corpus;

const CHAPTER_EN: Record<string, string> = {
  '卷一 · 諸星問答論': 'Book One · Questions and Answers on the Stars',
  '卷二 · 論諸星分屬南北斗化吉凶並分屬五行': 'Book Two · The Stars of the Two Dippers, Their Transformations and Elements',
  '卷二 · 十二宮諸星': 'Book Two · The Stars in the Twelve Palaces',
  '卷三 · 談星要論': 'Book Three · Essentials of Reading the Stars',
  '卷二 · 安祿權科忌四星變化訣': 'Book Two · Verse on the Four Transforming Stars',
  '卷二 · 六十花甲子納音歌': 'Book Two · Verse on the Sound Elements of the Sixty Pairs',
  '卷二 · 安身命例': 'Book Two · Placing the Life and Body Palaces',
};
const REF_EN: Record<string, string> = { 全表: 'full table', 全文: 'full text', 訣文: 'verse', 歌文: 'verse' };
const HUA_REF: Record<string, string> = { 禄: 'Abundance', 祿: 'Abundance', 权: 'Authority', 權: 'Authority', 科: 'Recognition', 忌: 'Obstruction' };

/** 出處（英文）：*Complete Book of Zi Wei Dou Shu*, Book One · …, What Zi Wei governs */
export function citationRefEn(src: LexiconEntry['sources'][number]): string {
  const c = CORPUS[src.corpus];
  const p = c?.passages[src.passage_id];
  if (!c || !p) return bookEn(src.corpus);
  let ref = REF_EN[p.ref] ?? p.ref;
  const asks = /^問(.+?)(?:星)?所主$/.exec(p.ref);
  if (asks) {
    const what = asks[1]!.startsWith('化') ? HUA_REF[asks[1]!.slice(1)] : LEXICON_EN[`star.${asks[1]}`]?.label;
    if (what) ref = `What ${what} governs`;
  }
  const palace = /^[一二三四五六七八九十]+\s*(.+)$/.exec(p.ref);
  if (palace) {
    const zh = palace[1]!.replace('宫', '宮').replace('财', '財').replace('迁', '遷').replace('奴仆', '僕役').replace('禄', '祿').replace('妻妾', '夫妻');
    const key = zh === '命宮' ? 'palace.命宮' : `palace.${zh}`;
    if (LEXICON_EN[key]) ref = LEXICON_EN[key]!.label;
  }
  return `${bookEn(src.corpus)}, ${CHAPTER_EN[p.chapter] ?? p.chapter}, ${ref}`;
}
