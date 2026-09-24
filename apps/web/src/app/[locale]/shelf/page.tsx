import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
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

/**
 * ⚠ 呢一版一定要 dynamic，唔可以靜態。
 *
 * G4 嗰陣量到：冇呢一行，`pnpm build` 會將呢一版**預先 render 咗**
 * 落 `.next/server/app/<locale>/…html`。
 *
 * 而家佢僥倖冇事，因為 build 期冇 Supabase 環境變數，`publicEnv()`
 * 喺掂到 `cookies()` 之前就掟咗 —— 即係話 Next 由頭到尾見唔到一個
 * dynamic API，於是安心噉將「一時搵不到」嗰版烘咗做靜態頁。
 *
 * 兩個後果，兩個都唔好：
 *
 *   一、環境變數行得通嗰陣，呢一版會喺 build 期撈一次資料 ——
 *       而 build 期冇人登入，所以最好嘅情況係又一版「搵不到」。
 *   二、**更差**：烘咗之後佢就係一版靜態頁，所有人、所有 session
 *       見到同一份 HTML，直到下次部署為止。
 *
 * 一版講緊「你嘅書」嘅頁，唔應該有一份大家共用嘅 HTML。
 */
export const dynamic = 'force-dynamic';

export default async function ShelfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const view = await shelfView(serverShelf());

  return (
    <main className="juan tai">
      <Juanshou title="書齋" nav="shelf" theme />

      {view.kind === 'unavailable' ? (
        /*
         * ⚠ 呢度唔會出一個空書架。
         *
         * 撈唔到你有幾多本書嗰陣，唔應該請你開多一本 ——
         * 所以呢個狀態亦都冇「＋ 新書」。
         */
        <p className="banxin text-body leading-[1.95] text-ink-2">
          一時搵不到你的書架。書沒有不見 —— 請過一會再試一次。
        </p>
      ) : (
        <>
          {/*
            * 認領提示第二個位：第二次回訪，書架頂**一條界欄**（架構 §4）。
            * 唔擋路、撳唔走 —— 佢本來就唔阻住你。
            */}
          {view.prompt ? (
            <p className="banxin mb-10 border-y jielan py-4 font-sans text-sm leading-[1.9] text-ink-3">
              這些書只認得這一部瀏覽器。
              <Link
                href="/claim"
                className="ms-2 text-indigo transition-colors duration-[240ms] hover:text-ink"
              >
                留一個電郵
              </Link>
            </p>
          ) : null}

          <div className="banxin">
            <Shelf spines={view.spines} />
          </div>
        </>
      )}
    </main>
  );
}
