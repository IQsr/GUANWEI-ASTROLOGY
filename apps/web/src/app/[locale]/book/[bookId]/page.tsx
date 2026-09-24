import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
import { contentsView } from '@/lib/juan-view';
import { serverJuan } from '@/lib/juan.server';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 命書目錄（工單 F1 · 架構 §2）
 *
 * ⚠ `dynamicParams = true`：`[bookId]` 係一個真動態段。
 * 根層 `[locale]/layout.tsx` 設咗 `false`（D2 —— 冇咗佢
 * `/sitemap.xml` 會被當成一個 locale 而回 404），所以呢一層要開返。
 *
 * noindex 無 OG：私密層（架構 §9）。命書唔分享，一張預覽圖都唔應該漏出去。
 */
export const dynamicParams = true;

export const metadata: Metadata = {
  title: '命書',
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

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { locale, bookId } = await params;
  setRequestLocale(locale);

  const view = await contentsView(serverJuan(), bookId);

  return (
    <main className="juan tai">
      <Juanshou
        back="shelf"
        title={view.kind === 'ok' ? view.title : undefined}
        nav="book"
        theme
      />

      {view.kind === 'ok' ? (
        <div className="banxin">
          <p className="font-sans text-cap tracking-[0.2em] text-ink-3">目　次</p>
          <ul className="mt-6 flex flex-col gap-3">
            {view.chapters.map((c) => (
              <li key={c.slug} className="border-b jielan pb-2">
                <Link
                  href={`/book/${bookId}/${c.slug}`}
                  className="text-body tracking-[0.06em] text-ink-2 transition-colors duration-200 ease-ink hover:text-ink"
                >
                  {c.title}
                </Link>
                {/* 未裁章喺目錄照樣列出章名，唔收埋（架構 §6）。 */}
                {c.tier === 'deep' ? (
                  <span className="ms-4 font-sans text-cap tracking-[0.14em] text-ink-3">未裁</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="banxin text-body leading-[1.95] text-ink-2">
          {view.kind === 'missing'
            ? '書齋裡沒有這一本。'
            : '一時找不到這本書。書沒有不見 —— 請過一會再試一次。'}
        </p>
      )}
    </main>
  );
}
