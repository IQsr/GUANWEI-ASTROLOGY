import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PageTurnLink } from '@/components/PageTurnLink';
import { ShiyanCard } from '@/components/ShiyanCard';
import { DingshiCard } from '@/components/DingshiCard';
import { chapterHref, payHref } from '@/lib/journey';
import { groupChapters, tally } from '@/lib/themes';
import type { ChapterMeta } from '@/lib/juan-view';

/**
 * 呢本書（重新設計第三期；2026-10-06 改做書嘅樣）
 *
 * 試讀回饋：開卷「似 PDF、好硬淨、冇 design 嘅感覺」。以前右頁係 app 嘅寫法 ——
 * 圓角卡片、圖示、陰影、一粒大黑掣。而家改返實體書嘅開卷：
 *
 *   一、「這本書」：三段短文（係乜、點讀、唔講乜）
 *   二、一行細字：幾多章、幾多免費、幾多未裁；一行「由《序》讀起 →」
 *   三、目錄：傳統書目，主題做小標，章名 ＋ 虛點 ＋ 右邊狀態（讀到這裡／未裁）
 *
 * ⚠ 「未裁」喺呢度解釋**一次**，喺版尾（架構 §4）。價錢唔喺呢度出（架構 §6）。
 * 純 props，冇撈資料 —— 真頁同 `/tokens/mulu` 樣板用同一個。
 */
export function BookContents({
  bookId,
  chapters,
  lastRead,
  cut,
  experiment = false,
  awaiting = false,
}: {
  bookId: string;
  chapters: readonly ChapterMeta[];
  lastRead: string | null;
  cut: boolean;
  /** 時辰小實驗嘅入口（有出生時間嘅書先出，2026-10-05） */
  experiment?: boolean;
  /** 待時辰（冇時辰、冇盤）：目次頂出「推算時辰（測試中）」（2026-10-09） */
  awaiting?: boolean;
}) {
  const t = useTranslations('book');
  const { preface, epilogue, groups, rest } = groupChapters(chapters);
  const count = tally(chapters, cut);
  const resume = chapters.find((c) => c.slug === lastRead) ?? null;
  const start = resume ?? preface ?? chapters[0] ?? null;

  const isUncut = (c: ChapterMeta) => c.tier === 'deep' && !cut;

  const row = (c: ChapterMeta) => (
    <li key={c.slug}>
      <PageTurnLink href={chapterHref(bookId, c.slug)} className="mulu-hang group">
        <span className="mulu-ming">{c.title}</span>
        <span className="mulu-dian" aria-hidden="true" />
        <span className="mulu-zhuang">
          {c.slug === lastRead ? (
            <span className="text-gold-ink">{t('readHere')}</span>
          ) : isUncut(c) ? (
            /* 未裁章照樣列出，唔收埋（架構 §6） */
            <span>{t('uncutTag')}</span>
          ) : (
            <span aria-hidden="true" className="mulu-jian">→</span>
          )}
        </span>
      </PageTurnLink>
    </li>
  );

  return (
    <div className="banxin shu-kai">
      {awaiting ? <DingshiCard bookId={bookId} /> : null}
      {/* 一、這本書 */}
      <section aria-labelledby="zhe-ben-shu" className="shu-jie">
        <h2 id="zhe-ben-shu" className="shu-xiao-biao">{t('aboutTitle')}</h2>
        <p>{t('about1')}</p>
        <p>{t('about2', { n: count.total })}</p>
        <p>{t('about3')}</p>
      </section>

      {/* 二、一行狀態 ＋ 一行開始 */}
      <div className="shu-qi">
        <p className="text-cap tracking-[0.16em] text-ink-3" data-nums>
          {t('total', { n: count.total })}
          <span className="mx-3 text-rule">·</span>
          {t('free', { n: count.free })}
          <span className="mx-3 text-rule">·</span>
          {count.uncut > 0 ? t('uncut', { n: count.uncut }) : t('allCut')}
        </p>
        {start ? (
          <PageTurnLink href={chapterHref(bookId, start.slug)} className="shu-kai-du">
            {resume ? t('resume', { title: resume.title }) : t('start', { title: start.title })}
            <span aria-hidden="true"> →</span>
          </PageTurnLink>
        ) : null}
      </div>

      {/* 三、目錄 */}
      <nav aria-labelledby="mu-lu" className="mulu">
        <h2 id="mu-lu" className="shu-xiao-biao">{t('contentsTitle')}</h2>
        {preface ? <ul>{row(preface)}</ul> : null}
        {groups.map(({ theme, chapters: list }) => (
          <section key={theme.key} aria-labelledby={`zhuti-${theme.key}`} className="mulu-zu">
            <h3 id={`zhuti-${theme.key}`} className="mulu-zu-ming">
              {t(`themes.${theme.key}.title`)}
            </h3>
            <ul>{list.map(row)}</ul>
          </section>
        ))}
        {rest.length > 0 ? (
          <section aria-labelledby="zhuti-rest" className="mulu-zu">
            <h3 id="zhuti-rest" className="mulu-zu-ming">
              {t('rest')}
            </h3>
            <ul>{rest.map(row)}</ul>
          </section>
        ) : null}
        {epilogue ? <ul className="mulu-zu">{row(epilogue)}</ul> : null}
      </nav>

      {experiment ? <ShiyanCard bookId={bookId} /> : null}

      {/* 「未裁」講一次，喺版尾 */}
      {count.uncut > 0 ? (
        <p className="border-t jielan pt-6 text-sm leading-[1.9] text-ink-3">
          {t('uncutNote')}
          <Link href={payHref(bookId)} className="lian ms-2 text-sm">
            {t('aboutCut')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
