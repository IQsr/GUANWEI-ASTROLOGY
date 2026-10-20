import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cast } from '@guanwei/ziwei';
import { routing } from '@/i18n/routing';
import { Wenmu } from '@/components/Wenmu';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';
import { buildAsks, leadsFromBodies } from '@/lib/wenmu';

export const metadata: Metadata = { title: '樣板 · 目次閱讀比較', robots: { index: false, follow: false } };
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** 與正式站驗收書相同的虛構生辰；不讀寫任何讀者書籍。 */
export default async function WenmuPreview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('book.asks');
  const solar = { y: 1984, m: 8, d: 16 };
  const result = cast({ solar, time: { h: 12, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
  if (!result.ok) return null;
  const sources = bookChapters(result.value, { seed: 'wenmu-preview', year: 2026, solar, place: '香港' });
  if (!sources) return null;
  const item = buildAsks(leadsFromBodies(chapterDrafts(sources, 'wenmu-preview')), locale).filter((a) => a.key === 'ming');
  const ask = item[0];
  if (!ask) return null;
  return (
    <main className="juan tai px-6 py-10">
      <h1 className="font-serif text-h2 tracking-[0.12em]">目次閱讀比較</h1>
      <p className="mt-3 text-sm text-ink-3">虛構命盤 · 保留原句，補一小段書內解讀</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <section aria-label="調整前">
          <h2 className="mb-6 text-sm text-ink-3">調整前</h2>
          <section className="shu-jie">
            <h2 className="shu-xiao-biao">{t('title')}</h2>
            <p className="text-sm">{t('lead')}</p>
            <div className="mt-4 py-2">
              <h3 className="font-serif text-lead tracking-[0.1em] text-ink">{t('q.ming.ask')}</h3>
              <span className="mt-1 block text-cap tracking-[0.16em] text-ink-3">{t('q.ming.sub')}</span>
              <span className="mt-3 block font-serif text-body leading-[1.95] text-ink-2">{ask.answer}</span>
              {ask.sources.map((s) => <span key={s.id} className="mt-1 block text-cap leading-[1.8] tracking-[0.06em] text-ink-3"><span className="me-2 text-cinnabar">{t('sourceMark')}</span>{t(s.pageConvention === 'pdf' ? 'sourceSection' : 'source', { book: s.book, page: s.page, section: s.section })}</span>)}
              <span className="mt-3 block text-cap tracking-[0.16em] text-ink-3">{t('readAll', { title: '一 · 命宮' })} →</span>
            </div>
          </section>
        </section>
        <section aria-label="調整後">
          <h2 className="mb-6 text-sm text-ink-3">調整後</h2>
          <Wenmu bookId="sample" items={item} titles={{ 命宮: '一 · 命宮' }} />
        </section>
      </div>
    </main>
  );
}
