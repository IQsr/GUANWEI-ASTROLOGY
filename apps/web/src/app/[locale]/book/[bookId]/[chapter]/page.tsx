import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Juan } from '@/components/Juan';
import { Suidu } from '@/components/Suidu';
import { Caikai } from '@/components/Caikai';
import { Weicai } from '@/components/Weicai';
import { cutPage } from './cut';
import { serverIdentity } from '@/lib/identity.server';
import { paragraphs } from '@/lib/suidu';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { MarkRead } from '@/components/MarkRead';
import { contentsView } from '@/lib/juan-view';
import { serverJuan } from '@/lib/juan.server';
import { notesFor } from '@/lib/mingshu';
import { markBook } from '@/lib/zhu';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const dynamicParams = true;

export const metadata: Metadata = {
  title: '命書',
  robots: { index: false, follow: false },
};

/**
 * 命書一章（工單 F1）
 *
 * ⚠ 註層要**成本書**一齊標 —— 「一個術語全書只標一次」係全書規矩，
 * 唔係逐章規矩。所以呢度要攞埋前面幾章嘅正文，標完先渲染呢一章。
 *
 * 呢個係一個真成本：讀一章要讀前面幾章。但另一個做法係喺 DB 度
 * 存住「邊幾個術語標咗」，而嗰樣嘢一改內容就即刻過時 ——
 * **一個算得返出嚟嘅嘢，唔好存。**
 */
/** ⚠ 同目錄嗰版一樣：一版講緊「你本書」嘅頁唔應該有一份大家共用嘅 HTML。 */
export const dynamic = 'force-dynamic';

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string; chapter: string }>;
}) {
  const { locale, bookId, chapter } = await params;
  setRequestLocale(locale);

  const port = serverJuan();
  const view = await contentsView(port, bookId);

  if (view.kind !== 'ok') {
    return (
      <main className="juan banxin">
        <Link href="/shelf" className="font-sans text-cap tracking-[0.2em] text-ink-3">
          ← 書齋
        </Link>
        <p className="mt-10 text-body leading-[1.95] text-ink-2">
          {view.kind === 'missing'
            ? '書齋裡沒有這一本。'
            : '一時找不到這本書。書沒有不見 —— 請過一會再試一次。'}
        </p>
      </main>
    );
  }

  const here = view.chapters.find((c) => c.slug === chapter);
  const upto = view.chapters.filter((c) => c.ord <= (here?.ord ?? 0));
  const fetched = await Promise.all(upto.map((c) => port.body(bookId, c.slug)));

  /*
   * ⚠ 標註要**成本書**一齊標，但跟捲動高亮只關呢一章事。
   * 所以前面幾章照樣攞返嚟標，段落結構就只有呢一章要（F2）。
   */
  const marked = markBook(
    upto.map((c, i) => ({
      palace: c.title,
      segments: paragraphs(fetched[i]?.text ?? '', fetched[i]?.slots ?? []).map((para) => ({
        slot: para.slot ?? '正文',
        text: para.text,
      })),
    })),
  );
  const mine = marked.at(-1);
  const body = fetched.at(-1)?.text ?? null;
  const chart = body === null ? null : ((await port.chart(bookId)) as ZChart | null);

  /*
   * ⚠ 「今次先裁開」係 DB 答嘅（`cut_page()`，0006），唔係 client 記住嘅。
   * 攞唔到正文就唔使問 —— 一版未裁嘅頁冇嘢好裁。
   */
  const justCut = here && body !== null ? await cutPage(here.id) : false;

  /*
   * 匿名就去認領，認領咗先去付款（架構 §4 硬閘）。
   * ⚠ 撈唔到就當匿名 —— 帶去 `/claim` 最多係行多一步，
   * 帶去 checkout 就係令一個匿名讀者行一條 DB 嗰邊實會彈嘅路。
   */
  let isAnonymous = true;
  try {
    isAnonymous = (await serverIdentity().currentReader())?.isAnonymous ?? true;
  } catch {
    /* 冇 session 就係匿名。 */
  }

  return (
    <main className="juan banxin">
      <Link
        href={`/book/${bookId}`}
        className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
      >
        ← 目次
      </Link>

      {/* 冇畫面。記低讀到邊、幾時讀 —— 書架靠佢排序（E3）。 */}
      {here ? <MarkRead bookId={bookId} slug={here.slug} /> : null}

      {!here ? (
        <p className="mt-10 text-body leading-[1.95] text-ink-2">這本書沒有這一章。</p>
      ) : (
        <>
          <h1 className="mt-6 text-h1 font-semibold tracking-[0.16em]">{here.title}</h1>
          <div className="mt-10">
            {body === null ? (
              /*
               * 未裁之頁（架構 §6 · F4）。
               *
               * ⚠ 「攞唔到正文」唔係喺呢度決定嘅：DB 嗰個 `chapter_body()`
               * 查過票先回值（G1）。一個只靠前端唔 render 嘅 paywall
               * 唔係 paywall。
               */
              <Weicai
                title={here.title}
                slots={fetched.at(-1)?.slots ?? []}
                bookId={bookId}
                isAnonymous={isAnonymous}
              />
            ) : chart ? (
              /* 隨讀：右側細命盤跟捲動高亮（F2）。 */
              <Caikai play={justCut}>
                <Suidu chart={chart} palace={here.slug}>
                  <Juan segments={mine!.segments} notes={notesFor(marked)} />
                </Suidu>
              </Caikai>
            ) : (
              /* 撈唔到盤就淨係出正文 —— 唔出一個空格當個盤。 */
              <Juan segments={mine!.segments} notes={notesFor(marked)} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
