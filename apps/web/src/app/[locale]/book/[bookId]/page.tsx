import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
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

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { locale, bookId } = await params;
  setRequestLocale(locale);

  const view = await contentsView(serverJuan(), bookId);

  return (
    <main className="juan banxin">
      <Link
        href="/shelf"
        className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
      >
        ← 書齋
      </Link>

      {view.kind === 'ok' ? (
        <>
          <h1 className="mt-6 text-h1 font-semibold tracking-[0.16em]">{view.title}</h1>
          <p className="mt-4 font-sans text-cap tracking-[0.2em] text-ink-3">目　次</p>
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
        </>
      ) : (
        <p className="mt-10 max-w-banxin text-body leading-[1.95] text-ink-2">
          {view.kind === 'missing'
            ? '書齋裡沒有這一本。'
            : '一時找不到這本書。書沒有不見 —— 請過一會再試一次。'}
        </p>
      )}
    </main>
  );
}
