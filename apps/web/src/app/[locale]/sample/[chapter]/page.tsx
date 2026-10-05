import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { BookSpread } from '@/components/BookSpread';
import { ChapterNav } from '@/components/ChapterNav';
import { ChapterTitle } from '@/components/ChapterTitle';
import { Juan } from '@/components/Juan';
import { Juanshou } from '@/components/Juanshou';
import { NightScene } from '@/components/NightScene';
import { StarDial } from '@/components/StarDial';
import { dialFor } from '@/lib/dial';
import { chapterHref, chapterParam, contentsHref, neighbours, SAMPLE_BOOK } from '@/lib/journey';
import { notesFor } from '@/lib/mingshu';
import { sampleBook } from '@/lib/sample-book';
import { paragraphs } from '@/lib/suidu';
import { markBook } from '@/lib/zhu';
import { englishChapters, englishTitle, isEnglish } from '@/lib/english';

/** 示範書每一章都喺 build 嗰陣出好（章名係固定嗰廿章）。 */
export function generateStaticParams() {
  const book = sampleBook();
  return routing.locales.flatMap((locale) => (book?.chapters ?? []).map((c) => ({ locale, chapter: c.slug })));
}

/** 同真書一樣嘅重點頁 */
const JADE_CHAPTERS = ['這十年', '這一年', '給你的話'];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sample' });
  return { title: t('metaTitle'), robots: { index: false, follow: true } };
}

/**
 * 示範命書一章（2026-10-04）
 *
 * 同真書嗰版（`book/[bookId]/[chapter]`）一樣砌法：註層成本書一齊標、章尾金線星盤、上下章導覽。
 * 唔同嘅：冇裁書（全書已開）、冇記讀到邊，章尾加一格「起你自己的盤」。
 */
export default async function SampleChapter({ params }: { params: Promise<{ locale: string; chapter: string }> }) {
  const { locale, chapter: raw } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sample');
  const tr = await getTranslations('reading');
  const tn = await getTranslations('nav');
  const chapter = chapterParam(raw);
  const book = sampleBook();
  const here = book?.drafts.find((d) => d.slug === chapter);

  if (!book || !here) {
    return (
      <main className="juan tai">
        <Juanshou back={{ href: '/sample', label: t('title') }} />
        <p className="banxin text-body leading-[1.95] text-ink-2">{t('missing')}</p>
      </main>
    );
  }

  /* 示範書全開：導覽唔好標「未裁」 */
  const en = isEnglish(locale);
  const open = book.chapters.map((c) => ({ ...c, title: en ? englishTitle(c.title) : c.title, tier: 'free' as const }));
  const { prev, next } = neighbours(open, here.slug);
  const turnPrev = prev
    ? { href: chapterHref(SAMPLE_BOOK, prev.slug), label: tr('turnTo', { title: prev.title }) }
    : { href: contentsHref(SAMPLE_BOOK), label: tr('turnTo', { title: tn('contents') }) };
  const turnNext = next ? { href: chapterHref(SAMPLE_BOOK, next.slug), label: tr('turnTo', { title: next.title }) } : null;

  /* 註層：成本書標到呢章為止（同真書一樣，一個術語全書只標一次） */
  const upto = book.drafts.filter((d) => d.ord <= here.ord);
  const marked = en
    ? markBook(englishChapters(upto.map((d) => ({ text: d.body, slots: d.slots }))).map((segments, i) => ({ palace: upto[i]!.title, segments })), 'en')
    : markBook(
    upto.map((d) => ({
      palace: d.title,
      segments: paragraphs(d.body, d.slots).map((p) => ({ slot: p.slot ?? '正文', text: p.text })),
    })),
  );
  const mine = marked.at(-1)!;
  const dial = dialFor(book.chart, here.slug, book.layers, en);

  return (
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="desk" />
      <Juanshou
        back={{ href: contentsHref(SAMPLE_BOOK), label: t('title') }}
        aside={
          <Link href="/cast" className="lian text-cap tracking-[0.16em]">
            {t('cta')} →
          </Link>
        }
      />
      <BookSpread
        chart={book.chart}
        layers={book.layers}
        palace={here.slug}
        tone={JADE_CHAPTERS.includes(here.slug) ? 'jade' : undefined}
        follow
        prev={turnPrev}
        next={turnNext}
        top={<p className="font-serif text-lead tracking-[0.16em] text-ink-2">{t('title')}</p>}
      >
        <ChapterTitle title={en ? englishTitle(here.title) : here.title} />
        <div className="mt-10">
          <Juan segments={mine.segments} notes={notesFor(marked, locale)} />
        </div>
        {dial ? <StarDial {...dial} en={en} /> : null}
        <ChapterNav bookId={SAMPLE_BOOK} prev={prev} next={next} />
        <aside className="banxin ka mt-10 p-6">
          <h2 className="font-serif text-lead tracking-[0.14em]">{t('endTitle')}</h2>
          <p className="mt-3 text-sm leading-[1.9] text-ink-2">{t('endBody')}</p>
          <Link href="/cast" className="btn-mo mt-5">
            {t('cta')}
            <span className="btn-jiantou" aria-hidden="true">→</span>
          </Link>
        </aside>
      </BookSpread>
    </main>
  );
}
