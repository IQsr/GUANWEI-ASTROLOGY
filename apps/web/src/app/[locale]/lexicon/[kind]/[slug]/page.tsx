import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { CORPUS, citationRef, distinctBooks } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { LEXICON_LOCALE, allEntryParams, canonicalOf, entryOf, hrefOf, isKind, relatedOf, teaser } from '@/lib/lexicon';
import { LexiconCta } from '@/components/LexiconCta';
import { MARK, OG_LEXICON } from '@/lib/site';

/**
 * 詞條頁（工單 D1）
 *
 * 出處：架構 §7、視覺系統 §5 版 · §4 字
 *
 * ── 呢一版同其他命理站最大嘅分別，係下半版 ──
 *
 * 上半係象義，人人都有。下半係**引文**：書名、卷、篇、逐字原文。
 * 再下面係一句我哋自己講嘅話 ——「呢兩條引文出自同一本書」。
 *
 * 一個列出處嘅網站，最唔誠實嘅做法就係列出處而唔講啲出處有幾薄。
 * 所以嗰個 ⚠ 唔係謙虛，係條件：講得出邊度嚟，就要講得出佢有幾實。
 */

const KIND_LABEL: Record<string, string> = {
  star: '主星',
  palace: '宮位',
  sihua: '四化',
  ju: '五行局',
};

export function generateStaticParams() {
  return allEntryParams().map((p) => ({ ...p, locale: LEXICON_LOCALE }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; kind: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, kind, slug } = await params;
  if (locale !== LEXICON_LOCALE || !isKind(kind)) return {};
  const e = entryOf(kind, slug);
  if (!e) return {};
  /*
   * description 由 `teaser()` 切 —— 同目錄頁嗰行用返同一個 function。
   *
   * 第一版寫 `summary.slice(0, 110)`：一嚟停喺半個詞（同 D1 目錄頁犯過嘅
   * 同一個錯），二嚟一百一十個中文字喺搜尋結果度一定被截。
   * 七十八字左右先係一句完整而且顯示得晒嘅話。
   */
  const description = teaser(e.summary, 78);
  /*
   * ⚠ canonical 由**詞條本身**砌，唔用 route param。
   *
   * 第一版寫 `encodeURIComponent(slug)`，出嚟係 `%25E7%25B4%25AB%25E5%25BE%25AE`
   * —— 因為 `slug` 已經係 encode 咗嘅，encode 多次就變咗 `%25`。
   *
   * 一條指去 404 嘅 canonical，比冇 canonical 更差：
   * 佢主動話畀搜尋器聽「呢版嘅正本喺嗰度」，而嗰度唔存在。
   */
  const path = canonicalOf(e);
  return {
    title: e.label,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path },
    openGraph: {
      /*
       * 卡片入面真正有資訊嗰兩行係呢度出 ——
       * 張圖係共用嘅，所以標題同摘要要逐條唔同，否則分享出去三十五條一個樣。
       */
      title: `${e.label} · ${MARK}藏經閣`,
      description,
      type: 'article',
      url: path,
      images: [{ url: OG_LEXICON, width: 1200, height: 630, alt: '觀微 藏經閣' }],
    },
  };
}

export default async function LexiconEntryPage({
  params,
}: {
  params: Promise<{ locale: string; kind: string; slug: string }>;
}) {
  const { locale, kind, slug } = await params;
  if (locale !== LEXICON_LOCALE || !isKind(kind)) notFound();
  setRequestLocale(locale);

  const e = entryOf(kind, slug);
  if (!e) notFound();

  const books = distinctBooks(e);
  const oneWitness = books.length < 2;
  const related = relatedOf(e);

  return (
    <main className="banxin juan">
      <Link
        href="/lexicon"
        className="font-sans text-cap tracking-[0.24em] text-ink-3 transition-colors duration-[240ms] hover:text-indigo"
      >
        藏經閣
      </Link>

      <p className="mt-tiantou font-sans text-cap tracking-[0.24em] text-ink-3">
        {KIND_LABEL[kind]}
      </p>
      <h1 className="mt-3 text-h1 tracking-[0.06em]">{e.label}</h1>

      {/* 摘要：註層用嘅同一份資產，寫一次用兩次（內容系統 §4）。 */}
      <p className="mt-8 text-lead leading-[1.95] text-ink-2">{e.summary}</p>

      <div className="mt-12 border-t border-rule pt-10">
        {e.full.split('\n').map((para, i) => (
          <p key={i} className="mb-6 text-body last:mb-0">
            {para}
          </p>
        ))}
      </div>

      {/* ── 出處 ─────────────────────────────────────────── */}
      <section className="mt-tiantou">
        <h2 className="font-sans text-cap tracking-[0.24em] text-ink-3">出處</h2>
        <ol className="mt-4 border-t border-rule">
          {e.sources.map((src, i) => (
            <li key={i} className="border-b border-rule-2 py-4">
              <p className="font-sans text-sm text-ink-2">{citationRef(src)}</p>
              {/*
                引文逐字抄自原書，而且 build 嗰陣由 zod 落去語料庫核過
                （抄錯一個字就 parse 唔到）。所以佢擺得出嚟畀人對。
              */}
              <blockquote className="mt-2 border-s border-rule ps-4 text-body text-ink">
                「{src.quote}」
              </blockquote>
            </li>
          ))}
        </ol>

        <p className="mt-4 font-sans text-sm leading-[1.9] text-ink-3">
          {oneWitness ? (
            <>
              <span className="em-zhu">⚠</span>{' '}
              以上引文全部出自《{books[0]}》的不同篇章 —— 是兩個文本位置，一個證人。
              這一條目前未經第二本書覆核。
            </>
          ) : (
            <>以上引文分別出自 {books.length} 本書：{books.join('、')}。</>
          )}
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-sans text-cap tracking-[0.24em] text-ink-3">相關</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={hrefOf(r)}
                  className="text-body transition-colors duration-[240ms] hover:text-indigo"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-tiantou border-t border-rule pt-4">
        <LexiconCta />
        <p className="mt-6 font-sans text-cap leading-[2] text-ink-3">
          語料庫：《{CORPUS.quanshu?.book}》{CORPUS.quanshu?.edition}
          <br />
          這一頁不涉及任何人的命盤 —— 沒有生辰、沒有排盤、沒有帳號。
        </p>
      </footer>
    </main>
  );
}

export const dynamic = 'force-static';
export const dynamicParams = false;
