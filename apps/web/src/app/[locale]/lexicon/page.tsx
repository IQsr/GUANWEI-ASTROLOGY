import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { lexiconCoverage, singleBookEntries } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
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
    <main className="juan tai jing-ye ye-ink">
      {/* 成版係經閣長廊（固定背景，globals.css .jing-di）；字用夜色（日讀都係一間暗房，唔可以用日讀嘅深字） */}
      <div className="jing-di" aria-hidden="true" />

      {/*
        藏經閣（2026-10-15 改版）：之前係黑底一列列字。而家成版係一個經櫃 ——
        成版背景係經閣長廊（/img/study/jing-wide.webp、jing-tall.webp），標題寫喺長廊中間暗處，
        每一類詞條係一個櫃，每一條係一格抽屜：燙金字寫名，下面兩行摘要。
      */}
      <header className="jing-tou">
        <div className="jing-tou-zi">
          {/* 由書入嚟先會出「返回閱讀」；擺喺標題上面，唔另開一行空卷首 */}
          <ReturnToReading />
          <h1 className="text-display font-semibold tracking-[0.16em]">{t('title')}</h1>
          <p className="mt-4 text-lead leading-[1.85] text-ink-2">{t('intro')}</p>
        </div>
      </header>

      <div className="jing-ben">
        {/*
          ⚠ 覆蓋率同單一來源嘅數字擺喺**公開頁**，唔係收喺 repo 入面。

          `lexiconCoverage()` 個註釋寫住「呢個數應該公開，唔應該收埋」。
          一個講出處嘅網站，最唔誠實嘅做法就係列出處而唔講啲出處有幾薄。
          2026-10-15：寫喺藏書牌上（金線之間嘅金字），同經櫃一齊。
        */}
        <div className="jing-bu">
          <dl className="font-sans text-sm" data-nums>
            <div className="flex justify-between gap-6 py-1">
              <dt>{t('entries')}</dt>
              <dd>
                {cov.done} / {cov.target}
              </dd>
            </div>
            <div className="flex justify-between gap-6 py-1">
              <dt>{t('singleSource')}</dt>
              <dd className="em-zhu">{single}</dd>
            </div>
          </dl>
          <p className="mt-3 font-sans text-xs leading-[1.8] opacity-80">{t('twoSourcesNote')}</p>
        </div>

        {KINDS.map((kind) => {
          const rows = entriesOf(kind);
          if (rows.length === 0) return null;
          return (
            <section key={kind} className="mt-16" aria-labelledby={`jing-${kind}`}>
              <h2 id={`jing-${kind}`} className="jing-lei">
                {t(`kind.${kind}`)}
                <span className="ms-3 text-ink-3" data-nums>
                  {rows.length}
                </span>
              </h2>
              {/* 一個櫃：木框入面一格格，每格一條詞條 */}
              <ul className="jing-gui">
                {rows.map((e) => (
                  <li key={e.id}>
                    {/*
                      摘要左對齊、最多兩行（`teaserFor()` 保證句子完整；line-clamp 只係闊度唔夠嗰陣嘅保險，
                      省略號出喺尾）。以前得一行仲要 truncate，讀者見到半句。
                    */}
                    <Link href={hrefOf(e)} className="jing-ge">
                      <span className={`jing-qian ${locale === 'en' ? 'jing-qian-xi' : ''}`}>{textOf(e, locale).label}</span>
                      <span className="jing-zhai">{teaserFor(textOf(e, locale).summary, locale)}</span>
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
            {/* 派別出處喺全站頁尾（SiteFooter），呢度唔再寫一次 */}
            {t('noPersonal')}
          </p>
        </footer>
      </div>
    </main>
  );
}

export const dynamic = 'force-static';
