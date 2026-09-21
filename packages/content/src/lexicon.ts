/**
 * L0 詞條（工單 C3）
 *
 * 出處：內容系統 §3（層級）、§8（兩個來源）、docs/voice-spec.md §3、§6
 *
 * 每條詞條兩個欄：
 *   summary  150–200 字　命書入面嘅註層。讀者撳個墨點就見到呢段。
 *   full     400–600 字　藏經閣嘅詞條頁。可公開索引，冇個人資料。
 *
 * ── 呢個檔案最重要嘅一件事 ──
 *
 * **引文要喺語料庫逐字搵得返。**
 *
 * 「每條兩個來源」如果只係 frontmatter 度寫兩行書名，等於冇 ——
 * 冇人核得到，而核唔到嘅出處同冇出處喺讀者眼中係一樣嘅。
 * 所以每個 source 要帶 `passage_id` 同 `quote`，
 * lint 會去 `src/sources/*.json` 嘅原文入面搵。搵唔到 → 唔准 published。
 *
 * 語料庫係公有領域嘅明代刊本（維基文庫本《紫微斗數全書》），
 * 所以引得、放得入 repo、亦都放得上藏經閣。
 * **現代著作唔可以咁做** —— 嗰啲只可以寫書名頁碼，唔可以抄原文。
 */
import { z } from 'zod';
import quanshu from './sources/quanshu.json';
import t2sDoc from './sources/t2s.json';

type Corpus = {
  book: string;
  edition: string;
  passages: Record<string, { chapter: string; ref: string; lines: [number, number]; text: string }>;
};

export const CORPUS: Record<string, Corpus> = {
  quanshu: quanshu as unknown as Corpus,
};

/** 中文字數。標點、空白、拉丁字母唔計 —— 「四百字」講緊漢字。 */
export function cjkCount(s: string): number {
  return (s.match(/[㐀-鿿]/g) ?? []).length;
}

/** 引文比對用：拉掉空白同換行，因為原檔係由 PDF 匯出，斷行位置冇意義。 */


export const LexiconSource = z.object({
  corpus: z.string().min(1),
  passage_id: z.string().min(1),
  /** 由語料庫逐字抄。至少四個字，否則核唔到乜。 */
  quote: z.string().min(4),
});

export const LexiconKind = z.enum(['star', 'palace', 'sihua', 'ju']);
export const LexiconStatus = z.enum(['draft', 'reviewed', 'published']);

export const LexiconEntry = z
  .object({
    id: z.string().regex(/^(star|palace|sihua|ju)\.[^\s.]+$/, 'id 要係 star.紫微 呢種形式'),
    kind: LexiconKind,
    label: z.string().min(1),
    /** 註層用。 */
    summary: z.string().min(1),
    /** 藏經閣用。 */
    full: z.string().min(1),
    sources: z.array(LexiconSource).min(2, '每條詞條至少兩個來源（內容系統 §8）'),
    /** 各家講法唔一。標咗就唔准 published —— 要寫出嚟，唔係靜靜雞出街。 */
    disputed: z.boolean().default(false),
    status: LexiconStatus,
    see_also: z.array(z.string()).default([]),
    /** 內部備註，唔出街。 */
    note: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    if (e.id.split('.')[0] !== e.kind) {
      ctx.addIssue({ code: 'custom', message: `${e.id}：id 前綴同 kind（${e.kind}）唔夾` });
    }
    const s = cjkCount(e.summary);
    if (s < 150 || s > 200) {
      ctx.addIssue({ code: 'custom', message: `${e.id}：摘要 ${s} 字，要 150–200（內容系統 §3）` });
    }
    const f = cjkCount(e.full);
    if (f < 400 || f > 600) {
      ctx.addIssue({ code: 'custom', message: `${e.id}：全文 ${f} 字，要 400–600（內容系統 §3）` });
    }
    /*
     * ⚠ 詞條唔用「他／她」呢個代名詞。
     *
     * C9 統一咗基塊嘅人稱（讀者一律「你」），但**冇掃詞條** ——
     * 而詞條先係公開嗰層：藏經閣（D1）逐條出靜態頁，
     * 係全站唯一一層搜尋器見得到嘅嘢。最公開嗰批文字，反而係最遲先掃嗰批。
     *
     * 詞條同命書嘅 register 唔同：命書對住一個讀者講，所以用「你」；
     * 詞條係字典，佢定義一個詞，所以用「這個人／一個人」呢種泛稱。
     * 兩種都啱 —— 但**代名詞唔得**：一篇講星同宮嘅文字入面，
     * 「他」可以指嗰粒星、指盤主、指伴侶，讀者要估。
     *
     * 摘要仲要喺讀者本書入面做註層用（內容系統 §4 寫一次用兩次），
     * 所以佢一句寫出嚟要兩個場合都讀得通。泛稱兩邊都得，代名詞兩邊都唔清楚。
     */
    for (const [field, text] of [['摘要', e.summary], ['全文', e.full]] as const) {
      const ta = text.match(/(?<!其)他(?!人)|她/);
      if (ta) {
        ctx.addIssue({
          code: 'custom',
          message: `${e.id}：${field}用咗「${ta[0]}」—— 詞條唔用代名詞，用「這個人」或者重寫`,
        });
      }
    }
    if (e.disputed && e.status === 'published') {
      ctx.addIssue({ code: 'custom', message: `${e.id}：disputed 唔准 published —— 各家說法不一要寫出嚟` });
    }
    // 引文核對：搵唔到就唔准 published
    for (const src of e.sources) {
      const c = CORPUS[src.corpus];
      if (!c) {
        ctx.addIssue({ code: 'custom', message: `${e.id}：唔認得語料庫 ${src.corpus}` });
        continue;
      }
      const p = c.passages[src.passage_id];
      if (!p) {
        ctx.addIssue({ code: 'custom', message: `${e.id}：${src.corpus} 冇 passage ${src.passage_id}` });
        continue;
      }
      if (!normaliseForMatch(p.text).includes(normaliseForMatch(src.quote))) {
        ctx.addIssue({
          code: 'custom',
          message: `${e.id}：引文喺 ${src.passage_id} 搵唔返 —— 「${src.quote.slice(0, 20)}…」`,
        });
      }
    }
  });

export type LexiconEntry = z.infer<typeof LexiconEntry>;

/** 一條詞條靠幾多本**唔同嘅書**。全部同一本 = 兩個來源但一個證人。 */
export function distinctBooks(e: LexiconEntry): string[] {
  return [...new Set(e.sources.map((s) => CORPUS[s.corpus]?.book ?? s.corpus))];
}

/** 引文喺原文邊幾行 —— 畀藏經閣嘅「查原文」連結用。 */
export function citationRef(src: LexiconEntry['sources'][number]): string {
  const c = CORPUS[src.corpus]!;
  const p = c.passages[src.passage_id]!;
  return `《${c.book}》${p.chapter}〈${p.ref}〉`;
}

export function buildLexicon(raw: unknown[]): LexiconEntry[] {
  const out = raw.map((r) => LexiconEntry.parse(r));
  const seen = new Set<string>();
  for (const e of out) {
    if (seen.has(e.id)) throw new Error(`詞條 ID 重複：${e.id}`);
    seen.add(e.id);
  }
  return out;
}

/**
 * 繁 → 簡 單字對照，淨係用嚟比對引文。
 *
 * 語料庫係維基文庫嘅**簡體**數位化本，而我哋自己寫嘅正文係**繁體**。
 * 兩邊唔normalise，引文就永遠核唔到 ——
 * 而核唔到嘅結果係我哋會以為自己冇引錯，其實根本冇核過。
 *
 * 呢個表係機器生成嘅（OpenCC t2s）。佢**唔係翻譯工具**，唔好攞去轉正文。
 */
const T2S: Record<string, string> = (t2sDoc as unknown as { map: Record<string, string> }).map;

/** 比對用嘅正規化：拉走空白，再統一做簡體。 */
export function normaliseForMatch(s: string): string {
  let out = '';
  for (const ch of s.replace(/[\s　]/g, '')) out += T2S[ch] ?? ch;
  return out;
}

/**
 * 拎走文字入面**核得返原文**嘅引文。
 *
 * 點解要有呢個 function：黑名單掃描係逐個 substring 掃嘅，
 * 而古文引文會無辜中招 —— 「天府出外遇貴人扶」入面有「外遇」，
 * 但佢係「出外／遇貴人」，唔係我哋喺度講外遇。
 *
 * **但唔可以就咁跳過所有引號入面嘅嘢** —— 咁樣人人都可以用引號收埋一句斷語。
 * 所以條件好嚴：嗰段文字要**逐字喺語料庫搵得返**先至跳過。
 * 即係話，古人寫過嘅可以引，我哋自己寫嘅一律要掃。
 */
export function withoutCitations(text: string): string {
  return text.replace(/「([^」]+)」/g, (whole, inner: string) => {
    const needle = normaliseForMatch(inner);
    if (needle.length < 4) return whole;
    for (const c of Object.values(CORPUS)) {
      for (const p of Object.values(c.passages)) {
        if (normaliseForMatch(p.text).includes(needle)) return '　';
      }
    }
    return whole;
  });
}
