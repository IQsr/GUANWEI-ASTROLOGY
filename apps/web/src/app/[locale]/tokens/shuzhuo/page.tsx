import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cast } from '@guanwei/ziwei';
import { BookSpread } from '@/components/BookSpread';
import { ChapterTitle } from '@/components/ChapterTitle';
import { StarDial } from '@/components/StarDial';
import { dialFor } from '@/lib/dial';
import { Juan } from '@/components/Juan';
import { NightScene } from '@/components/NightScene';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';
import { paragraphs } from '@/lib/suidu';
import { chartLayers } from '@/lib/layers.server';

/**
 * 書桌閱讀樣板（2026-10-04）：用示範盤砌一本書，用真嘅閱讀介面（BookSpread）出一章。
 *
 * 改閱讀頁設計（直排章名、水墨山、墨綠頁）唔使起真書 —— 起真書要寫 DB。
 * 內部參考，noindex，唔入 sitemap。`?ch=章名` 揀章，例如 `?ch=這十年`。
 */
export const metadata: Metadata = { title: '樣板 · 書桌閱讀', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';


export default async function ShuzhuoDemo({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ch?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ch } = await searchParams;
  const r = cast({
    solar: { y: 1990, m: 3, d: 21 },
    time: { h: 14, min: 20 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'female',
  });
  if (!r.ok) return <p>樣板排盤失敗。</p>;
  const sources = bookChapters(r.value, { seed: 'demo', year: 2026, solar: { y: 1990, m: 3, d: 21 }, place: '香港' }) ?? [];
  const drafts = chapterDrafts(sources, 'demo');
  const here = drafts.find((d) => d.slug === (ch ?? '命宮')) ?? drafts[1]!;
  const layers = chartLayers(r.value, 2026);
  const dial = dialFor(r.value, here.slug, layers);
  const segments = paragraphs(here.body, here.slots).map((p) => ({ slot: p.slot ?? '正文', runs: [{ text: p.text }] }));

  return (
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="desk" />
      <BookSpread
        chart={r.value}
        layers={layers}
        palace={here.slug}
        follow
        top={<p className="font-serif text-lead tracking-[0.16em] text-ink-2">樣板命書</p>}
      >
        <ChapterTitle title={here.title} />
        <div className="mt-10">
          <Juan segments={segments as never} notes={{}} />
        </div>
        {dial ? <StarDial {...dial} /> : null}
      </BookSpread>
    </main>
  );
}
