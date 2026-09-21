import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ShelfDemo } from '@/components/ShelfDemo';
import { ThemeToggle } from '@/components/ThemeToggle';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 書架嘅活樣板（工單 E3）。內部參考，noindex 無 OG，唔入 sitemap。
 */
export const metadata: Metadata = {
  title: '書架',
  robots: { index: false, follow: false },
};

export default async function ShelfDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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
          <h1 className="mt-3 text-h1 font-semibold tracking-[0.16em]">書架</h1>
        </div>
        <p className="max-w-[26rem] text-sm leading-[1.9] tracking-[0.06em] text-ink-2">
          工單 E3。五條線：頂板、兩塊立板、兩塊層板。零木紋、零陰影、零透視。
          最近讀嗰本喺最左，在讀嗰本轉朱砂，hover 升 10px。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      <ShelfDemo />

      <section className="mt-tiantou border-t jielan pt-10">
        <h2 className="text-h3 tracking-[0.16em]">空白書唔畫</h2>
        <p className="mt-4 max-w-banxin text-sm leading-[1.9] text-ink-2">
          「四本」入面其實有四行 —— 第四行係一本乜都冇寫過嘅書。
          佢同一格空位係同一樣嘢：冇名、冇盤、冇任何可以叫人認得返佢嘅嘢。
          畫咗出嚟，讀者就見到兩條一模一樣嘅虛線書脊，而佢分唔出邊條係邊條。
          所以「未題名」喺書架上面唔係一條書脊，係嗰格空位本身。
        </p>
      </section>
    </main>
  );
}
