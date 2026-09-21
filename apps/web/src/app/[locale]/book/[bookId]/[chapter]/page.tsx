import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Juan } from '@/components/Juan';
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
  const bodies = await Promise.all(upto.map((c) => port.body(bookId, c.slug)));

  const marked = markBook(
    upto.map((c, i) => ({
      palace: c.title,
      segments: bodies[i] ? [{ slot: '正文', text: bodies[i]! }] : [],
    })),
  );
  const mine = marked.at(-1);
  const body = bodies.at(-1) ?? null;

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
               * ⚠ 未裁之頁（架構 §6）—— 而家係一句話，F4 先做成毛邊。
               * 但「攞唔到正文」呢件事唔係喺呢度決定嘅：DB 嗰個
               * `chapter_body()` 查過票先回值（G1）。
               */
              <p className="text-body leading-[1.95] text-ink-2">
                這一頁還沒有裁開。
                <Link
                  href={`/pay/${bookId}`}
                  className="ms-3 text-indigo transition-colors duration-[240ms] hover:text-ink"
                >
                  裁開
                </Link>
              </p>
            ) : (
              <Juan segments={mine!.segments} notes={notesFor(marked)} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
