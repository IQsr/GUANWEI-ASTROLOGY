import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cast } from '@guanwei/ziwei';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Juan } from '@/components/Juan';
import { BookSpread } from '@/components/BookSpread';
import { Juanshou } from '@/components/Juanshou';
import { NightScene } from '@/components/NightScene';
import { markBook } from '@/lib/zhu';
import { bookChapters, localizeMarked, notesFor, citesFor } from '@/lib/mingshu';
import { chapterDrafts, readingContentVersion } from '@/lib/chengshu';
import { readingSegments } from '@/lib/chapter-reading';
import { chartLayers } from '@/lib/layers.server';
import { zhFor } from '@/lib/hans';

export const metadata: Metadata = { title: '命宮逐句依據 · 多盤預覽', robots: { index: false, follow: false } };
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

// 全部為虛構生辰；本頁只有生辰選擇，不保存任何命宮專用文案。
const CASES = [
  { key: 'tongliang', label: '同梁 · 示範盤', solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, sex: 'female' as const },
  { key: 'borrowed', label: '機陰 · 借星盤', solar: { y: 1984, m: 8, d: 16 }, time: { h: 12, min: 0 }, sex: 'female' as const },
  { key: 'pojun', label: '破軍 · 新舊並行', solar: { y: 1998, m: 12, d: 25 }, time: { h: 0, min: 34 }, sex: 'male' as const },
  { key: 'tanlang', label: '貪狼 · 未核分支留白', solar: { y: 1984, m: 11, d: 2 }, time: { h: 21, min: 15 }, sex: 'female' as const },
  { key: 'jiliang', label: '機梁 · 敏感與原則', solar: { y: 1985, m: 5, d: 9 }, time: { h: 12, min: 5 }, sex: 'male' as const },
];

export default async function BackedMingPreview({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ case?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const selected = CASES.find((c) => c.key === query.case) ?? CASES[0]!;
  const result = cast({ ...selected, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } });
  if (!result.ok) return null;
  const chart = result.value;
  // 與起盤成書完全同一路徑：通用寫作層 → 正文／逐句快照 → 書頁。沒有示範盤專用稿。
  const chapters = bookChapters(chart, { seed: 'backed-preview', year: 2026, solar: selected.solar, place: '香港' });
  if (!chapters) return null;
  const draft = chapterDrafts(chapters, readingContentVersion('preview')).find((c) => c.slug === '命宮');
  if (!draft) return null;
  const marked = localizeMarked(markBook([{ palace: '命宮', segments: readingSegments(draft.body, draft.slots, draft.reading) }]), locale);
  const z = (s: string) => zhFor(locale, s);
  return <main className="juan tai shuzhuo-tai ye-ink">
    <NightScene variant="table" />
    <Juanshou back={{ href: '/sample', label: z('示範命書') }} />
    <nav aria-label={z('預覽命盤')} className="banxin mb-6 flex flex-wrap gap-x-6 gap-y-3 text-cap text-ink-2">
      {CASES.map((c) => <Link key={c.key} href={`/tokens/ming-backed?case=${c.key}`} className="lian" aria-current={c.key === selected.key ? 'page' : undefined}>{z(c.label)}</Link>)}
    </nav>
    <BookSpread chart={chart} layers={chartLayers(chart, 2026)} palace="命宮" follow
      top={<div><p className="font-serif text-lead text-ink-2">{z(selected.label)}</p><p className="mt-2 text-cap text-ink-3">{z('逐句依據寫作層 · 虛構生辰預覽')}</p></div>}>
      <h1 className="mb-8 font-serif text-h2 tracking-[0.16em]">{z('一 · 命宮')}</h1>
      <Juan segments={marked[0]!.segments} notes={notesFor(marked, locale)} cites={citesFor(marked, locale)} />
      {!draft.body ? <p className="text-body leading-[1.95]">{z('這張盤的已核條件未足以出稿，命宮暫留空白。')}</p> : null}
      <p className="mt-10 text-cap leading-[1.9] text-ink-3">{z('本命偏向、格局或運程未核實的部分繼續留白；逐句來源不等於這些分支已經放行。')}</p>
    </BookSpread>
  </main>;
}
