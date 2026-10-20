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
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { displayTitle } from '@/lib/english';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'en' ? 'Life Palace · Expanded reading preview' : locale === 'ja' ? '命宮 · 一文ごとの出典付きプレビュー' : '命宮逐句依據 · 多盤預覽', robots: { index: false, follow: false } };
}
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
  const input = { text: draft.body, slots: draft.slots, reading: draft.reading };
  const segments = locale === 'en' ? englishChapters([input])[0]! : locale === 'ja' ? japaneseChapters([input])[0]! : readingSegments(draft.body, draft.slots, draft.reading);
  const marked = localizeMarked(markBook([{ palace: '命宮', segments }], locale === 'en' || locale === 'ja' ? locale : 'zh'), locale);
  const z = (s: string) => zhFor(locale, s);
  const labels: Record<string, { en: string; ja: string }> = {
    tongliang: { en: 'Tian Tong–Tian Liang · sample', ja: '天同・天梁 · 見本' },
    borrowed: { en: 'Tian Ji–Tai Yin · borrowed stars', ja: '天機・太陰 · 借星' },
    pojun: { en: 'Po Jun · renewal and continuity', ja: '破軍 · 刷新と継承' },
    tanlang: { en: 'Tan Lang · unverified branches omitted', ja: '貪狼 · 未確認の判断は保留' },
    jiliang: { en: 'Tian Ji–Tian Liang · sensitivity and principle', ja: '天機・天梁 · 感受性と原則' },
  };
  const label = (c: typeof selected) => locale === 'en' || locale === 'ja' ? labels[c.key]![locale] : z(c.label);
  const previewNote = locale === 'en' ? 'Sentence-backed writing · fictional birth details' : locale === 'ja' ? '一文ごとの出典付き · 架空の出生情報によるプレビュー' : z('逐句依據寫作層 · 虛構生辰預覽');
  const heldNote = locale === 'en' ? 'Unverified personal leanings, configurations and timing remain omitted; sentence-level sources do not activate those branches.' : locale === 'ja' ? '個人の傾向、格局、運期について未確認の判断は保留しています。一文ごとの出典があっても、それらの分岐が確認済みになるわけではありません。' : z('本命偏向、格局或運程未核實的部分繼續留白；逐句來源不等於這些分支已經放行。');
  return <main className="juan tai shuzhuo-tai ye-ink">
    <NightScene variant="table" />
    <Juanshou back={{ href: '/sample', label: locale === 'en' ? 'Sample book' : locale === 'ja' ? '見本の命書' : z('示範命書') }} />
    <nav aria-label={locale === 'en' ? 'Preview charts' : locale === 'ja' ? '命盤のプレビュー' : z('預覽命盤')} className="banxin mb-6 flex flex-wrap gap-x-6 gap-y-3 text-cap text-ink-2">
      {CASES.map((c) => <Link key={c.key} href={`/tokens/ming-backed?case=${c.key}`} className="lian" aria-current={c.key === selected.key ? 'page' : undefined}>{label(c)}</Link>)}
    </nav>
    <BookSpread chart={chart} layers={chartLayers(chart, 2026)} palace="命宮" follow
      top={<div><p className="font-serif text-lead text-ink-2">{label(selected)}</p><p className="mt-2 text-cap text-ink-3">{previewNote}</p></div>}>
      <h1 className="mb-8 font-serif text-h2 tracking-[0.16em]">{displayTitle('一 · 命宮', locale)}</h1>
      <Juan segments={marked[0]!.segments} notes={notesFor(marked, locale)} cites={citesFor(marked, locale)} />
      {!segments.length ? <p className="text-body leading-[1.95]">{locale === 'en' ? 'The verified material is insufficient for this reading, so the Life Palace is left blank.' : locale === 'ja' ? '確認済みの内容だけでは本文を整えられないため、命宮は空欄にしています。' : z('這張盤的已核條件未足以出稿，命宮暫留空白。')}</p> : null}
      <p className="mt-10 text-cap leading-[1.9] text-ink-3">{heldNote}</p>
    </BookSpread>
  </main>;
}
