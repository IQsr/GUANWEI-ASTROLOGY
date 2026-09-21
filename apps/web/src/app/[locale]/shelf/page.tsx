import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Shelf } from '@/components/Shelf';
import { shelfView } from '@/lib/shelf';
import { serverShelf } from '@/lib/shelf.server';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 書齋（工單 E3 · 架構 §4 · 視覺系統 §8）
 *
 * ── 書齋同書架係同一個地方 ──
 *
 * 工單簿 v0.2 將原本嘅 F3 書架併咗入嚟。所以呢一版唔係「我嘅書列表」，
 * 佢係**第二本書嘅起點**：永遠有一條虛線書脊「＋ 新書」。
 *
 * noindex 無 OG：私密層（架構 §9）。
 */
export const metadata: Metadata = {
  title: '書齋',
  robots: { index: false, follow: false },
};

export default async function ShelfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const view = await shelfView(serverShelf());

  return (
    <main className="mx-auto w-full max-w-page px-6 pb-dijiao pt-10">
      <header className="mb-10 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b jielan pb-5">
        <h1 className="text-h1 font-semibold tracking-[0.16em]">書齋</h1>
        <nav className="flex gap-6 font-sans text-cap tracking-[0.18em] text-ink-3">
          <Link href="/lexicon" className="transition-colors duration-200 ease-ink hover:text-ink-2">
            藏經閣
          </Link>
          <Link href="/account" className="transition-colors duration-200 ease-ink hover:text-ink-2">
            設定
          </Link>
        </nav>
      </header>

      {view.kind === 'unavailable' ? (
        /*
         * ⚠ 呢度唔會出一個空書架。
         *
         * 撈唔到你有幾多本書嗰陣，唔應該請你開多一本 ——
         * 所以呢個狀態亦都冇「＋ 新書」。
         */
        <p className="max-w-banxin text-body leading-[1.95] text-ink-2">
          一時搵不到你的書架。書沒有不見 —— 請過一會再試一次。
        </p>
      ) : (
        <>
          {/*
            * 認領提示第二個位：第二次回訪，書架頂**一條界欄**（架構 §4）。
            * 唔擋路、撳唔走 —— 佢本來就唔阻住你。
            */}
          {view.prompt ? (
            <p className="mb-10 max-w-banxin border-y jielan py-4 font-sans text-sm leading-[1.9] text-ink-3">
              這些書只認得這一部瀏覽器。
              <Link
                href="/claim"
                className="ms-2 text-indigo transition-colors duration-[240ms] hover:text-ink"
              >
                留一個電郵
              </Link>
            </p>
          ) : null}

          <Shelf spines={view.spines} />
        </>
      )}
    </main>
  );
}
