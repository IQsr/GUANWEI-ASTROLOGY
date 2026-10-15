import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cast } from '@guanwei/ziwei';
import { Link } from '@/i18n/navigation';
import { BookSpread } from '@/components/BookSpread';
import { ChapterTitle } from '@/components/ChapterTitle';
import { NightScene } from '@/components/NightScene';
import { chartLayers } from '@/lib/layers.server';
import { PAIR_DEMOS, citesOf } from '@/lib/pairing-demo';

/**
 * 兩人對照預覽（2026-10-15）：Sonnet 5.5 寫嘅連接句，擺落真嘅閱讀介面睇吓係點。
 *
 * 左頁係其中一個人嘅盤（亮夫妻宮），右頁係成篇對照。`?p=01`–`05` 揀一對，`?who=B` 換左頁畫邊個。
 * 內部參考，noindex，唔入 sitemap。資料見 `lib/pairing-demo.ts`。
 */
export const metadata: Metadata = { title: '樣板 · 兩人對照', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** 一節嘅出處收埋喺節尾一行（逐句跟出處，同一句《全書》會連出五次，讀唔落） */
function Ju({ cites }: { cites: string[] }) {
  return cites.length ? (
    <p className="mt-3 font-sans text-cap tracking-[0.06em] text-ink-3">據 {cites.join('　')}</p>
  ) : null;
}

export default async function HepanDemo({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ p?: string; who?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { p, who } = await searchParams;
  const pair = PAIR_DEMOS.find((x) => x.id === p) ?? PAIR_DEMOS[0]!;
  const [a, b] = pair.people;
  const left = who === 'B' ? b : a;
  const r = cast(left.birth);
  if (!r.ok) return <p>樣板排盤失敗。</p>;
  const { headline, sections } = pair.out;
  const href = (id: string, w = 'A') => `/tokens/hepan?p=${id}${w === 'B' ? '&who=B' : ''}`;

  return (
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="desk" />
      <BookSpread
        chart={r.value}
        layers={chartLayers(r.value, 2026)}
        palace="夫妻"
        top={<p className="font-serif text-lead tracking-[0.16em] text-ink-2">{left.name}的命盤</p>}
      >
        <ChapterTitle title="兩人對照" />
        <p className="mt-8 font-serif text-lead tracking-[0.2em] text-ink-2">
          {a.name}　×　{b.name}
        </p>
        <p className="mt-6 font-serif text-h2 leading-[1.7]">{headline.text}</p>
        <Ju cites={citesOf(pair, headline)} />

        <div className="wen mt-10 flex flex-col gap-8">
          {sections.map((sec) => (
            <section key={sec.title}>
              <h2 className="font-serif text-lead tracking-[0.14em]">{sec.title}</h2>
              <p className="mt-3 text-body leading-[1.95]">{sec.sentences.map((s) => s.text).join('')}</p>
              <Ju cites={[...new Set(sec.sentences.flatMap((s) => citesOf(pair, s)))]} />
            </section>
          ))}
        </div>

        <aside className="ka mt-12 p-6">
          <p className="text-sm leading-[1.9] text-ink-2">
            書中沒有比較兩個人命盤的方法。這一頁只把兩邊書上各自講過的話擺在一起，不判斷合不合。
          </p>
          <p className="mt-4 font-sans text-cap tracking-[0.1em] text-ink-3">
            試樣 · Claude Sonnet 5.5 · 每句都過出處檢查
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-sans text-cap tracking-[0.1em]">
            {PAIR_DEMOS.map((x) => (
              <Link key={x.id} href={href(x.id)} className={x.id === pair.id ? 'text-ink' : 'lian'}>
                {x.people[0].name}×{x.people[1].name}
              </Link>
            ))}
            <Link href={href(pair.id, who === 'B' ? 'A' : 'B')} className="lian">
              左頁換{who === 'B' ? a.name : b.name}的盤
            </Link>
          </nav>
        </aside>
      </BookSpread>
    </main>
  );
}
