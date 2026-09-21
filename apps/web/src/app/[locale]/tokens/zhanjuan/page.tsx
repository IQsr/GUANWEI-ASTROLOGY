import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cast } from '@guanwei/ziwei';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ZhanjuanDemo } from '@/components/ZhanjuanDemo';
import { ThemeToggle } from '@/components/ThemeToggle';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** 展卷嘅活樣板（工單 E6）。內部參考，noindex 無 OG，唔入 sitemap。 */
export const metadata: Metadata = {
  title: '展卷',
  robots: { index: false, follow: false },
};

export default async function ZhanjuanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = cast({
    solar: { y: 1998, m: 3, d: 12 },
    time: { h: 7, min: 40 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.1694, lat: 22.3193, label: '香港' },
    sex: 'male',
  });

  return (
    <main className="mx-auto w-full max-w-page px-6 pb-dijiao pt-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b jielan pb-5">
        <div>
          <Link
            href="/tokens"
            className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
          >
            ← 視覺系統
          </Link>
          <h1 className="mt-3 text-h1 font-semibold tracking-[0.16em]">展卷</h1>
        </div>
        <p className="max-w-[26rem] text-sm leading-[1.9] tracking-[0.06em] text-ink-2">
          工單 E6。界欄逐條畫出成十二宮，星以點落位，然後先出真盤。
          呢一幕唔係 loading —— 盤喺題名嗰陣已經算好，所以冇嘢等緊。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      {result.ok ? (
        <ZhanjuanDemo chart={result.value} />
      ) : (
        <p className="text-sm text-cinnabar">排盤失敗：{result.code}</p>
      )}

      <section className="mt-tiantou border-t jielan pt-10">
        <h2 className="text-h3 tracking-[0.16em]">一個規範同規範之間嘅衝突</h2>
        <div className="mt-4 flex max-w-banxin flex-col gap-3 text-sm leading-[1.9] text-ink-2">
          <p>
            視覺 §7 第四條：「錯落有上限 —— stagger 60–90ms，<b>最多五件</b>。」
            視覺 §9：「界欄<b>逐條</b>畫出成十二宮。」
          </p>
          <p>
            一個 4×4 盤面點都唔止五條界欄。兩句唔可能同時照字面做到。
          </p>
          <p>
            讀法：§7 嗰六條標題寫住「動（scroll animation 六條）」—— 佢哋管嘅係入場動效。
            而展卷係全站唯一一段寫定嘅序列，§9 逐幕寫死咗佢嘅節奏，
            亦都係全站唯一一次 pin scroll —— 嗰一刻讀者根本冇 scroll。
            所以呢一幕行 §9，其餘全站行 §7。
          </p>
        </div>
      </section>
    </main>
  );
}
