import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { Link } from '@/i18n/navigation';
import { BookSpread } from '@/components/BookSpread';
import { ChapterTitle } from '@/components/ChapterTitle';
import { Juan } from '@/components/Juan';
import { Juanshou } from '@/components/Juanshou';
import { NightScene } from '@/components/NightScene';
import { chapterDrafts } from '@/lib/chengshu';
import { readingSegments } from '@/lib/chapter-reading';
import { createBookChapters, citesFor, localizeMarked, notesFor } from '@/lib/mingshu';
import { chartLayers } from '@/lib/layers.server';
import { markBook } from '@/lib/zhu';
import { zhFor } from '@/lib/hans';
import allCases from '@/lib/free-ming-preview.json';
import randomFive from '@/lib/random-five-preview.json';

// 本機開發預覽：正式模式或未明確開啟時一律404，不接線上命書與帳戶。
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '十二宮新稿・本機預覽', robots: { index: false, follow: false } };
const root = '/preview/free-ming';
const groups: { key: string; label: string; seed: string; birth: BirthInput }[] = [
  { key: 'tongliang', label: '同梁寅申', seed: 'sample', birth: {
    solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, sex: 'female',
    tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' },
  } },
  { key: 'tianfu', label: '天府巳亥', seed: 'trilingual-review-2026-10-21-A', birth: {
    solar: { y: 1992, m: 9, d: 12 }, time: { h: 19, min: 41 }, sex: 'male',
    tz: 'Australia/Sydney', place: { lng: 151.2093, lat: -33.8688, label: '悉尼' },
  } },
  { key: 'jiliang', label: '機梁辰戌', seed: 'trilingual-review-2026-10-21-C', birth: {
    solar: { y: 2012, m: 4, d: 20 }, time: { h: 13, min: 29 }, sex: 'female',
    tz: 'America/New_York', place: { lng: -74.006, lat: 40.7128, label: '紐約' },
  } },
  ...randomFive.map(c=>({key:`random-${c.id.toLowerCase()}`,label:`抽查${c.id}・${c.system.name}`,seed:c.seed,birth:c.input as BirthInput})),
  ...allCases.map((c) => ({ key: `system-${String(c.n).padStart(2, '0')}${c.borrowed ? '-borrowed' : ''}`,
    label: `${c.name}${c.borrowed ? '（借星）' : ''}`, seed: c.seed, birth: c.input as BirthInput })),
];
const chapters = [{ key: 'ming', slug: '命宮' }, { key: 'bone', slug: '性格的骨架' }, {key:'steps',slug:'一生十二步'}, {key:'epilogue',slug:'給你的話'},
  ...[['siblings', '兄弟'], ['spouse', '夫妻'], ['children', '子女'], ['wealth', '財帛'], ['health', '疾厄'],
    ['travel', '遷移'], ['friends', '僕役'], ['career', '官祿'], ['property', '田宅'], ['wellbeing', '福德'], ['parents', '父母']]
    .map(([key, slug]) => ({ key: key!, slug: slug! }))];

export default async function FreeMingPreview({ params }: { params: Promise<{ locale: string; parts?: string[] }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.GUANWEI_READING_PREVIEW !== '1') notFound();
  const { locale, parts = [] } = await params;
  if (!['zh-Hant', 'zh-Hans'].includes(locale)) notFound();
  setRequestLocale(locale);
  if (!parts.length) return (
    <main className="juan tai">
      <Juanshou back={{ href: `${root}/tongliang/ming`, label: zhFor(locale, '回到先行三組') }} />
      <div className="banxin">
        <h1 className="font-serif text-h2 tracking-[0.12em]">{zhFor(locale, '十二宮閱讀預覽・敘事稿')}</h1>
        <p className="mt-4 text-sm leading-[1.9] text-ink-2">{zhFor(locale, '本機預覽，未部署。以下均為合成命盤；每宮一段直接建議，明示「編輯建議」。每段最多一個「據」，展開可讀出處、原文、條件與例外。')}</p>
        <nav aria-label="其餘十一宮" className="mt-6 flex flex-wrap gap-5 text-sm">
          {chapters.slice(2).map((c) => <Link key={c.key} className="lian" href={`${root}/tongliang/${c.key}`}>{zhFor(locale, c.slug)}</Link>)}
        </nav>
        <section className="mt-10"><h2 className="font-serif text-lead">五盤抽查・正文與收結</h2><nav className="mt-4 flex flex-wrap gap-5">{randomFive.map(c=><Link key={c.id} className="lian" href={`${root}/random-${c.id.toLowerCase()}/epilogue`}>{`抽查${c.id}・${c.system.name}`}</Link>)}</nav></section>
        {['實坐', '借星'].map((kind) => <section key={kind} className="mt-10">
          <h2 className="font-serif text-lead tracking-[0.12em]">{zhFor(locale, kind)}</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {allCases.filter((c) => c.borrowed === (kind === '借星')).map((c) => {
              const key = `system-${String(c.n).padStart(2, '0')}${c.borrowed ? '-borrowed' : ''}`;
              return <li key={key} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b jielan pb-3">
                <span className="text-sm">{c.n} · {zhFor(locale, c.name)}</span>
                <span className="flex gap-5 text-sm">
                  <Link className="lian" href={`${root}/${key}/ming`}>{zhFor(locale, '命宮')}</Link>
                  <Link className="lian" href={`${root}/${key}/bone`}>{zhFor(locale, '骨架')}</Link>
                  <Link className="lian" href={`${root}/${key}/spouse`}>{zhFor(locale, '夫妻')}</Link>
                  <Link className="lian" href={`${root}/${key}/property`}>{zhFor(locale, '田宅')}</Link>
                </span>
              </li>;
            })}
          </ul>
        </section>)}
      </div>
    </main>
  );
  const group = groups.find((g) => g.key === parts[0]);
  const chapter = chapters.find((c) => c.key === parts[1]);
  if (parts.length !== 2 || !group || !chapter) notFound();
  const result = cast(group.birth);
  if (!result.ok) notFound();
  const year = 2026;
  const sources = createBookChapters(result.value, { seed: group.seed, year, solar: group.birth.solar, place: group.birth.place.label, birthSex:group.birth.sex, birthInput:group.birth });
  if (!sources) notFound();
  const drafts = chapterDrafts(sources, group.seed);
  const here = drafts.find((d) => d.slug === chapter.slug);
  if (!here) notFound();
  const marked = localizeMarked(markBook(drafts.filter((d) => d.ord <= here.ord).map((d) => ({
    palace: d.title, segments: readingSegments(d.body, d.slots, d.reading),
  }))), locale);
  const index = chapters.indexOf(chapter);
  const turn = (i: number) => { const c = chapters[i]; return c ? { href: `${root}/${group.key}/${c.key}`, label: zhFor(locale, c.slug) } : null; };

  return (
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="table" />
      <Juanshou back={{ href: root, label: zhFor(locale, '全部星系・本機預覽・未部署') }} aside={
        <nav aria-label="選擇閱讀組別" className="flex flex-wrap gap-x-5 gap-y-2">
          {groups.slice(0, 8).map((g) => <Link key={g.key} href={`${root}/${g.key}/${chapter.key}`} aria-current={g.key === group.key ? 'page' : undefined}
            className="lian text-cap tracking-[0.12em]">{zhFor(locale, g.label)}</Link>)}
        </nav>
      } />
      <BookSpread key={`${group.key}/${chapter.key}`} chart={result.value} layers={chartLayers(result.value, year)}
        palace={here.slug} palaceLabel={zhFor(locale, here.slug)} follow
        prev={turn(index - 1)} next={turn(index + 1)}
        top={<div>
          <p className="font-serif text-lead tracking-[0.16em] text-ink-2">{zhFor(locale, group.label)}</p>
          <nav aria-label="選擇章節" className="mt-4 flex flex-wrap gap-5 text-sm">
            {chapters.map((c) => <Link key={c.key} href={`${root}/${group.key}/${c.key}`} className="lian"
              aria-current={c.key === chapter.key ? 'page' : undefined}>{zhFor(locale, c.slug)}</Link>)}
          </nav>
        </div>}
      >
        <ChapterTitle title={zhFor(locale, here.title)} />
        <div className="mb-8 flex flex-wrap gap-5 text-cap">
          {chapters.map((c) => <Link key={c.key} href={`${root}/${group.key}/${c.key}`} className="lian"
            aria-current={c.key === chapter.key ? 'page' : undefined}>{zhFor(locale, c.slug)}</Link>)}
        </div>
        <Juan key={`${group.key}/${chapter.key}`} segments={marked.at(-1)!.segments} notes={notesFor(marked, locale)} cites={citesFor(marked, locale)} />
      </BookSpread>
    </main>
  );
}
