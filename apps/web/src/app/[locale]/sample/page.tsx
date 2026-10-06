import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { BookContents } from '@/components/BookContents';
import { BookSpread } from '@/components/BookSpread';
import { Juanshou } from '@/components/Juanshou';
import { NightScene } from '@/components/NightScene';
import { LIFE_PALACE } from '@/lib/suidu';
import { chapterHref, SAMPLE_BOOK } from '@/lib/journey';
import { sampleBook } from '@/lib/sample-book';
import { englishTitle, isEnglish } from '@/lib/english';
import { Feiye } from '@/components/Feiye';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 示範命書嘅目次（2026-10-04）
 *
 * 同真書目次一樣嘅一版（左頁命盤、右頁目次），多兩樣：左頁頂講明係邊個虛構生辰，
 * 卷首右邊一直有「起你自己的盤」。全書已裁開，所以冇「未裁」。
 *
 * 靜態頁（build 嗰陣排一次）。暫時 noindex：架構 §9 嘅可索引白名單未包呢版，要 Issac 拍板先加。
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sample' });
  return { title: t('metaTitle'), description: t('metaDescription'), robots: { index: false, follow: true } };
}

export default async function SamplePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sample');
  const tr = await getTranslations('reading');
  const book = sampleBook();
  const first = book?.chapters[0];

  return (
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="table" />
      <Juanshou
        back={{ href: '/', label: t('back') }}
        aside={
          <Link href="/cast" className="lian text-cap tracking-[0.16em]">
            {t('cta')} →
          </Link>
        }
      />
      {book ? (
        <BookSpread
          chart={book.chart}
          palace={LIFE_PALACE}
          left={<Feiye title={t('title')} chart={book.chart} locale={locale} />}
          next={first ? { href: chapterHref(SAMPLE_BOOK, first.slug), label: tr('turnTo', { title: isEnglish(locale) ? englishTitle(first.title) : first.title }) } : null}
          top={
            <div>
              <h1 className="font-serif text-h2 font-semibold tracking-[0.16em]">{t('title')}</h1>
              <p className="mt-2 text-cap tracking-[0.12em] text-ink-3">{t('who')}</p>
            </div>
          }
        >
          <p className="banxin mb-8 border-b jielan pb-6 text-sm leading-[1.9] text-ink-2">{t('note')}</p>
          <BookContents bookId={SAMPLE_BOOK} chapters={isEnglish(locale) ? book.chapters.map((c) => ({ ...c, title: englishTitle(c.title) })) : book.chapters} lastRead={null} cut />
        </BookSpread>
      ) : (
        <p className="banxin text-body leading-[1.95] text-ink-2">{t('missing')}</p>
      )}
    </main>
  );
}
