import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WeicaiDemo } from '@/components/WeicaiDemo';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 未裁之頁嘅活樣板（工單 F4）。內部參考，noindex 無 OG，唔入 sitemap。
 *
 * ⚠ 真嗰條路要有 DB：一章裁得開未，係 `cut_page()` 答嘅（0006）。
 * 呢一版係畀人（同畀 `check-caijuan.mjs`）睇嗰兩個狀態嘅樣。
 */
export const metadata: Metadata = {
  title: '未裁之頁',
  robots: { index: false, follow: false },
};

export default async function WeicaiDemoPage({ params }: { params: Promise<{ locale: string }> }) {
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
          <h1 className="mt-4 text-h1 font-semibold tracking-[0.16em]">未裁之頁</h1>
        </div>
        <p className="max-w-banxin text-sm leading-[1.9] text-ink-2">
          工單 F4。未買嘅深度章 = 未裁嘅頁。右邊係一條撕痕，唔係一排鋸齒。
          撳「裁開」之後，紙由上而下退走 —— 一千六百毫秒，一生一次。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      <WeicaiDemo />
    </main>
  );
}
