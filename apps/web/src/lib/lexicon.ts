/**
 * 藏經閣路由（工單 D1）
 *
 * 出處：架構 §7 藏經閣、§9 索引與分享、視覺系統 §5 版
 *
 * ── 一個決定：藏經閣只有繁中版 ──
 *
 * 全站 routing 係 `localePrefix: 'as-needed'`，所以理論上會有
 * `/lexicon/star/紫微` 同 `/en/lexicon/star/紫微` 兩條路由。
 *
 * 但詞條**只有繁中**。出一個 `/en/…` 路由包住一模一樣嘅中文內容：
 * 對搜尋器係重複內容（而藏經閣係全站唯一嘅流量入口，唔可以自己踩自己），
 * 對讀者係一版打開嚟乜都睇唔明嘅嘢。
 *
 * 所以 `generateStaticParams` 只出繁中，其餘 locale 一律 404。
 * 有英文詞條嗰日先開 —— 唔係而家開定個空殼。
 */
import { LEXICON, type LexiconEntry } from '@guanwei/content';

export const LEXICON_LOCALE = 'zh-Hant';

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
