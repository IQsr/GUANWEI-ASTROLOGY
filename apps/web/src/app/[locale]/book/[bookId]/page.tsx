import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { BookContents } from '@/components/BookContents';
import { BookSpread } from '@/components/BookSpread';
import { LIFE_PALACE } from '@/lib/suidu';
import { chapterHref } from '@/lib/journey';
import { NightScene } from '@/components/NightScene';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { Juanshou } from '@/components/Juanshou';
import { contentsView } from '@/lib/juan-view';
import { serverJuan } from '@/lib/juan.server';
import { FontWarm } from '@/components/FontWarm';
import { distinctChars } from '@/lib/fontwarm';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'book' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

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
  const t = await getTranslations('book');
  const tShelf = await getTranslations('shelf');

  const port = serverJuan();
  const view = await contentsView(port, bookId);
  /* 左頁嘅命盤。撈唔到就冇盤，右頁照出目次 */
  const chart = view.kind === 'ok' ? (((await port.chart(bookId).catch(() => null))?.payload ?? null) as ZChart | null) : null;
  /* 撳右邊（或者 →）：由第一章讀起。目次係第一頁，冇上一頁 */
  const tr = await getTranslations('reading');
  const first = view.kind === 'ok' ? view.chapters[0] : undefined;
  const next = first ? { href: chapterHref(bookId, first.slug), label: tr('turnTo', { title: first.title }) } : null;
  /* 由目次翻去第一章：先載定嗰章用到嘅字（見 FontWarm） */
  const ahead = first ? await port.body(bookId, first.slug).catch(() => null) : null;
  const warm = distinctChars(`${first?.title ?? ''}${ahead?.text ?? ''}`);

  return (
    /*
     * 書桌閱讀：展卷之後本書一直攤開喺桌面上 —— 目次係本書嘅一頁，唔係另一個網頁。
     * 左頁命盤（亮命宮），右頁目次。
     */
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="desk" />
      <FontWarm text={warm} />
      {/* 書桌閱讀：卷首淨係返回同四步，書名寫喺左頁頂 —— 本書高啲，一眼睇得晒 */}
      <Juanshou back="shelf" step={3} title={view.kind === 'ok' ? undefined : tShelf('untitled')} />

      {view.kind === 'ok' ? (
        <BookSpread
          chart={chart}
          palace={LIFE_PALACE}
          next={next}
          top={
            <h1 className="font-serif text-h2 font-semibold tracking-[0.16em]">
              {view.title ?? tShelf('untitled')}
            </h1>
          }
        >
          <BookContents bookId={bookId} chapters={view.chapters} lastRead={view.lastRead} cut={view.cut} />
        </BookSpread>
      ) : (
        <p className="banxin text-body leading-[1.95] text-ink-2">
          {view.kind === 'missing'
            ? t('missing')
            : t('unavailable')}
        </p>
      )}
    </main>
  );
}
