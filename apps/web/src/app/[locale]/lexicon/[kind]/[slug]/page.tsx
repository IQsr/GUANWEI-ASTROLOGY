import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CORPUS, citationRef, distinctBooks } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
import { ReturnToReading } from '@/components/ReturnToReading';
import { LEXICON_LOCALES, allEntryParams, bookEn, canonicalOf, citationRefEn, entryOf, hrefOf, isKind, isLexiconLocale, lexiconAlternates, localePath, relatedOf, teaserFor, textOf } from '@/lib/lexicon';
import { zhFor } from '@/lib/hans';
import { LexiconCta } from '@/components/LexiconCta';
import { OG_LEXICON } from '@/lib/site';

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

/* 類別名喺 messages：`lexicon.kind.*`。 */

export function generateStaticParams() {
  return LEXICON_LOCALES.flatMap((locale) => allEntryParams().map((p) => ({ ...p, locale })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; kind: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, kind, slug } = await params;
  if (!isLexiconLocale(locale) || !isKind(kind)) return {};
  const e = entryOf(kind, slug);
  if (!e) return {};
  /*
   * description 由 `teaser()` 切 —— 同目錄頁嗰行用返同一個 function。
   *
   * 第一版寫 `summary.slice(0, 110)`：一嚟停喺半個詞（同 D1 目錄頁犯過嘅
   * 同一個錯），二嚟一百一十個中文字喺搜尋結果度一定被截。
   * 七十八字左右先係一句完整而且顯示得晒嘅話。
   */
  const text = textOf(e, locale);
  const description = teaserFor(text.summary, locale, 78);
  /*
   * ⚠ canonical 由**詞條本身**砌，唔用 route param。
   *
   * 第一版寫 `encodeURIComponent(slug)`，出嚟係 `%25E7%25B4%25AB%25E5%25BE%25AE`
   * —— 因為 `slug` 已經係 encode 咗嘅，encode 多次就變咗 `%25`。
   *
   * 一條指去 404 嘅 canonical，比冇 canonical 更差：
   * 佢主動話畀搜尋器聽「呢版嘅正本喺嗰度」，而嗰度唔存在。
   */
  const zhPath = canonicalOf(e);
  const path = localePath(zhPath, locale);
  const t = await getTranslations({ locale, namespace: 'lexicon' });
  return {
    title: text.label,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path, languages: lexiconAlternates(zhPath) },
    openGraph: {
      /*
       * 卡片入面真正有資訊嗰兩行係呢度出 ——
       * 張圖係共用嘅，所以標題同摘要要逐條唔同，否則分享出去三十五條一個樣。
       */
      title: t('entryTitle', { label: text.label }),
      description,
      type: 'article',
      url: path,
      images: [{ url: OG_LEXICON, width: 1200, height: 630, alt: t('ogAlt') }],
    },
  };
}

export default async function LexiconEntryPage({
  params,
}: {
  params: Promise<{ locale: string; kind: string; slug: string }>;
}) {
  const { locale, kind, slug } = await params;
  if (!isLexiconLocale(locale) || !isKind(kind)) notFound();
  setRequestLocale(locale);

  const e = entryOf(kind, slug);
  if (!e) notFound();

  const t = await getTranslations({ locale, namespace: 'lexicon' });
  const en = locale === 'en';
  /* 簡體：出處、引文、書名都由繁體轉 */
  const z = (s: string) => zhFor(locale, s);
  const text = textOf(e, locale);
  const books = en ? [...new Set(e.sources.map((s) => bookEn(s.corpus)))] : distinctBooks(e).map(z);
  const oneWitness = books.length < 2;
  const related = relatedOf(e);

  return (
    <main className="juan tai">
      <Juanshou back="lexicon" aside={<ReturnToReading />} />

      <div className="banxin">
        {/* ⚠ 詞條個名係資料，所以佢同章名一樣：喺頁頭之下，唔喺頁頭入面。 */}
        <p className="font-sans text-cap tracking-[0.24em] text-ink-3">
          {t(`kind.${kind}`)}
        </p>
        <h1 className="mt-3 text-h1 font-semibold tracking-[0.16em]">{text.label}</h1>

        {/* 摘要：註層用嘅同一份資產，寫一次用兩次（內容系統 §4）。 */}
        <p className="mt-8 text-lead leading-[1.95] text-ink-2">{text.summary}</p>

        <div className="mt-12 border-t border-rule pt-10">
          {text.full.split('\n').filter((x) => x.trim()).map((para, i) => (
            <p key={i} className="mb-6 text-body last:mb-0">
              {para}
            </p>
          ))}
        </div>

        {/* ── 出處 ─────────────────────────────────────────── */}
        <section className="mt-tiantou">
          <h2 className="font-sans text-cap tracking-[0.24em] text-ink-3">{t('sources')}</h2>
          <ol className="mt-4 border-t border-rule">
            {e.sources.map((src, i) => (
              <li key={i} className="border-b border-rule-2 py-4">
                <p className="font-sans text-sm text-ink-2">{en ? citationRefEn(src) : z(citationRef(src))}</p>
                {/*
                  引文逐字抄自原書，而且 build 嗰陣由 zod 落去語料庫核過
                  （抄錯一個字就 parse 唔到）。所以佢擺得出嚟畀人對。
                */}
                {/* 英文版：原文照附（公有領域），標明係原文，唔假扮係英文 */}
                {en ? <p className="mt-2 font-sans text-cap tracking-[0.14em] text-ink-3">{t('originalText')}</p> : null}
                <blockquote lang={locale === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant'} className="mt-2 border-s border-rule ps-4 text-body text-ink">
                  「{z(src.quote)}」
                </blockquote>
              </li>
            ))}
          </ol>

          <p className="mt-4 font-sans text-sm leading-[1.9] text-ink-3">
            {oneWitness ? (
              <>
                <span className="em-zhu">⚠</span>{' '}
                {t('oneWitness', { book: books[0] ?? '' })}
              </>
            ) : (
              <>{t('manyBooks', { count: books.length, books: books.join(en ? '; ' : '、') })}</>
            )}
          </p>
        </section>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-sans text-cap tracking-[0.24em] text-ink-3">{t('related')}</h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={hrefOf(r)}
                    className="text-body transition-colors duration-[240ms] hover:text-indigo"
                  >
                    {textOf(r, locale).label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-tiantou border-t border-rule pt-4">
          <LexiconCta />
          <p className="mt-6 font-sans text-cap leading-[2] text-ink-3">
            {t('corpus', { book: en ? bookEn('quanshu') : z(CORPUS.quanshu?.book ?? ''), edition: en ? 'Wikisource, public domain' : z(CORPUS.quanshu?.edition ?? '') })}
            <br />
            {t('noPersonalEntry')}
          </p>
        </footer>
    
      </div>
    </main>
  );
}

export const dynamic = 'force-static';
export const dynamicParams = false;
