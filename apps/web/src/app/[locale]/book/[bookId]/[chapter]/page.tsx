import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Juanshou, backToContents } from '@/components/Juanshou';
import { routing } from '@/i18n/routing';
import { Juan } from '@/components/Juan';
import { BookSpread } from '@/components/BookSpread';
import { NightScene } from '@/components/NightScene';
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
import { FontWarm } from '@/components/FontWarm';
import { distinctChars } from '@/lib/fontwarm';
import { markBook } from '@/lib/zhu';
import { ChapterNav } from '@/components/ChapterNav';
import { chapterHref, chapterParam, contentsHref, neighbours } from '@/lib/journey';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
  const { locale, bookId, chapter: rawChapter } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('book');
  const tShelf = await getTranslations('shelf');
  /* 章名係中文：無論 Next 畀嘅係 encode 咗定未，都解返做章名先對（交接文件嗰個疑點）。 */
  const chapter = chapterParam(rawChapter);

  const port = serverJuan();
  /* 命盤同身份唔使等目次：先開跑，下面先攞（見下面嗰段 Promise.all） */
  const chartP = port.chart(bookId).catch(() => null);
  const anonP = serverIdentity()
    .currentReader()
    .then((r) => r?.isAnonymous ?? true)
    .catch(() => true);
  const view = await contentsView(port, bookId);

  if (view.kind !== 'ok') {
    return (
      <main className="juan tai">
        <Juanshou back="shelf" nav="book" step={3} />
        <p className="banxin text-body leading-[1.95] text-ink-2">
          {view.kind === 'missing'
            ? t('missing')
            : t('unavailable')}
        </p>
      </main>
    );
  }

  const here = view.chapters.find((c) => c.slug === chapter);
  const { prev, next } = neighbours(view.chapters, chapter);
  /*
   * 撳左邊／右邊（或者 ← →）翻去邊：上一章、下一章。
   * 第一章嘅上一頁係目次；最後一章冇下一頁。
   */
  const tr = await getTranslations('reading');
  const tn = await getTranslations('nav');
  const turnPrev = prev
    ? { href: chapterHref(bookId, prev.slug), label: tr('turnTo', { title: prev.title }) }
    : { href: contentsHref(bookId), label: tr('turnTo', { title: tn('contents') }) };
  const turnNext = next ? { href: chapterHref(bookId, next.slug), label: tr('turnTo', { title: next.title }) } : null;
  const upto = view.chapters.filter((c) => c.ord <= (here?.ord ?? 0));

  /*
   * ⚠ 呢幾樣互不相干，一齊攞（2026-09，Issac：翻頁 lag）。以前逐樣 await：
   * 命盤 → 各章正文 → 下一章 → 裁開 → 身份，一個等一個。
   *
   *   左頁嘅命盤：未裁嘅章都出（盤唔係深度章嘅內容）
   *   下一章用到嘅字：畀瀏覽器得閒嗰陣先載定字體（見 FontWarm）。鎖住嘅章 text 係 null，就淨係章名
   *   匿名就去認領，認領咗先去付款（架構 §4 硬閘）。⚠ 撈唔到就當匿名 ——
   *   帶去 `/claim` 最多係行多一步，帶去 checkout 就係令一個匿名讀者行一條 DB 嗰邊實會彈嘅路。
   */
  const [chartRaw, fetched, ahead, isAnonymous] = await Promise.all([
    chartP,
    Promise.all(upto.map((c) => port.body(bookId, c.slug))),
    next ? port.body(bookId, next.slug).catch(() => null) : Promise.resolve(null),
    anonP,
  ]);
  const chart = chartRaw as ZChart | null;
  const warm = distinctChars(`${next?.title ?? ''}${ahead?.text ?? ''}`);

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
  /*
   * ⚠ 「今次先裁開」係 DB 答嘅（`cut_page()`，0006），唔係 client 記住嘅。
   * 攞唔到正文就唔使問 —— 一版未裁嘅頁冇嘢好裁。
   */
  const justCut = here && body !== null ? await cutPage(here.id) : false;

  return (
    /* 書桌閱讀：左頁命盤跟住右頁讀緊嘅段落亮，右頁喺頁入面捲 */
    <main className="juan tai shuzhuo-tai ye-ink">
      <NightScene variant="desk" />
      <Juanshou back={backToContents(bookId)} step={3} />

      {/* 冇畫面。記低讀到邊、幾時讀 —— 書架靠佢排序（E3）。 */}
      {here ? <MarkRead bookId={bookId} slug={here.slug} title={here.title} /> : null}
      <FontWarm text={warm} />

      {!here ? (
        <p className="banxin text-body leading-[1.95] text-ink-2">{t('noChapter')}</p>
      ) : (
        <BookSpread
          chart={chart}
          palace={here.slug}
          follow={body !== null}
          prev={turnPrev}
          next={turnNext}
          top={<p className="font-serif text-lead tracking-[0.16em] text-ink-2">{view.title ?? tShelf('untitled')}</p>}
        >
          {/* ⚠ 章名係內容嘅一部分，唔係頁頭：擺喺右頁頂 */}
          <h1 className="text-h1 font-semibold tracking-[0.16em]">{here.title}</h1>
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
                slug={here.slug}
                isAnonymous={isAnonymous}
              />
            ) : (
              /*
               * 裁開動畫淨係深度章播（2026-09，Issac 揀）：畀咗錢之後第一次揭開，先係「裁開」嗰一下。
               * 免費章以前每章第一次讀都播 1.6 秒，頭一次由頭讀到尾，翻一頁就等兩段動畫。
               * `cut_page()` 照舊記低（第一次讀嘅時間），只係唔播。
               */
              <Caikai play={justCut && here.tier === 'deep'}>
                <Juan segments={mine!.segments} notes={notesFor(marked)} />
              </Caikai>
            )}
          </div>
          <ChapterNav bookId={bookId} prev={prev} next={next} />
        </BookSpread>
      )}
    </main>
  );
}
