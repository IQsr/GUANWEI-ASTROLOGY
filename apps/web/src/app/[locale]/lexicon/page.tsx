import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { lexiconCoverage, singleBookEntries } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
import { ReturnToReading } from '@/components/ReturnToReading';
import { OG_LEXICON } from '@/lib/site';
import { KINDS, LEXICON_LOCALES, entriesOf, hrefOf, isLexiconLocale, lexiconAlternates, localePath, teaserFor, textOf } from '@/lib/lexicon';
import { LexiconCta } from '@/components/LexiconCta';

export function generateStaticParams() {
  return LEXICON_LOCALES.map((locale) => ({ locale }));
}

/* 類別名（主星、宮位⋯）喺 messages：`lexicon.kind.*`。 */

/* 英文藏經閣（2026-10-05 開）：詞條有英文，介面字跟 locale；原文照附 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'lexicon' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: localePath('/lexicon', locale), languages: lexiconAlternates('/lexicon') },
    openGraph: {
      title: t('ogTitle'),
      description: t('description'),
      type: 'website',
      url: localePath('/lexicon', locale),
      images: [{ url: OG_LEXICON, width: 1200, height: 630, alt: t('ogAlt') }],
    },
    /**
     * 全站得兩版可索引：入齋（/）同呢度（架構 §9）。
     *
     * ⚠ 呢一層冇任何個人資料 —— 冇命盤、冇生辰、冇帳號。
     * 佢係唯一一層**應該**被索引嘅內容，亦都係唯一一層索引得起。
     */
    robots: { index: true, follow: true },
  };
}

export default async function LexiconIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLexiconLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'lexicon' });
  const cov = lexiconCoverage();
  const single = singleBookEntries().length;

  return (
    <main className="juan tai">
      <Juanshou title={t('title')} aside={<ReturnToReading />} />

      <div className="banxin">
        <p className="text-lead text-ink-2">
          {t('intro')}
        </p>

        {/*
          ⚠ 覆蓋率同單一來源嘅數字擺喺**公開頁**，唔係收喺 repo 入面。

          `lexiconCoverage()` 個註釋寫住「呢個數應該公開，唔應該收埋」。
          一個講出處嘅網站，最唔誠實嘅做法就係列出處而唔講啲出處有幾薄。
        */}
        <dl className="mt-10 border-t border-rule pt-4 font-sans text-sm text-ink-2" data-nums>
          <div className="flex justify-between border-b border-rule-2 py-2">
            <dt>{t('entries')}</dt>
            <dd>
              {cov.done} / {cov.target}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>{t('singleSource')}</dt>
            <dd className="em-zhu">{single}</dd>
          </div>
        </dl>

        <p className="mt-4 font-sans text-sm leading-[1.9] text-ink-3">
          {t('twoSourcesNote')}
        </p>

        {KINDS.map((kind) => {
          const rows = entriesOf(kind);
          if (rows.length === 0) return null;
          return (
            <section key={kind} className="mt-16">
              <h2 className="font-sans text-cap tracking-[0.24em] text-ink-3">
                {t(`kind.${kind}`)}
                <span className="ml-3" data-nums>
                  {rows.length}
                </span>
              </h2>
              <ul className="mt-4 border-t border-rule">
                {rows.map((e) => (
                  <li key={e.id} className="border-b border-rule-2">
                    {/*
                      ⚠ 摘要要**左對齊**。
                      第一版寫咗 `text-end` ＋ `truncate`：右對齊之下，
                      overflow 係由**頭**度剪走嘅，而且冇省略號 ——
                      即係讀者見到一句冇頭嘅說話，而 `teaser()` 特登整咗一句
                      完整嘅話出嚟，完全白費。

                      左對齊之後兩樣嘢先夾得返：`teaser()` 保證句子完整，
                      `truncate` 淨係做闊度唔夠嗰陣嘅保險，而且省略號出喺尾。
                    */}
                    <Link
                      href={hrefOf(e)}
                      className="flex items-baseline gap-6 py-3 transition-colors duration-[240ms] hover:text-indigo"
                    >
                      <span className={`${locale === 'en' ? 'w-[11em]' : 'w-[6.5em]'} shrink-0 text-h3`}>{textOf(e, locale).label}</span>
                      <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-3">
                        {teaserFor(textOf(e, locale).summary, locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <footer className="mt-tiantou border-t border-rule pt-4">
          <LexiconCta />
          <p className="mt-6 font-sans text-cap leading-[2] text-ink-3">
            {t('school')}
            <br />
            {t('noPersonal')}
          </p>
        </footer>
    
      </div>
    </main>
  );
}

export const dynamic = 'force-static';
