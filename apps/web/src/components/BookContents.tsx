import { Link } from '@/i18n/navigation';
import { ThemeIcon } from '@/components/ThemeIcon';
import { chapterHref, payHref } from '@/lib/journey';
import { groupChapters, tally } from '@/lib/themes';
import type { ChapterMeta } from '@/lib/juan-view';

/**
 * 呢本書（重新設計第三期 · 取代 F1 嗰張淨係章名嘅清單）
 *
 * 之前嘅目次係一張章名清單：睇唔到呢本書係點、讀到邊、「未裁」係乜。
 * 而家一版講四樣嘢，由上而下：
 *
 *   一、呢本書有幾多章、幾多免費、幾多未裁（一行）
 *   二、下一步：續讀上次嗰章，未讀過就由序讀起（一粒掣）
 *   三、序（開卷，自己一格）
 *   四、三個主題卡，入面列返宮位章（參考稿「我的命書」）
 *
 * ⚠ 「未裁」喺呢度解釋**一次**，喺版尾，唔係逐章講 ——
 * 同架構 §4「老實講一次就唔好再嘈」同一個態度。
 * 價錢唔喺呢度出（架構 §6：全站得 `/pay` 准出價錢）。
 *
 * 純 props，冇撈資料 —— 真頁同 `/tokens/mulu` 樣板用同一個。
 */
export function BookContents({
  bookId,
  chapters,
  lastRead,
  cut,
}: {
  bookId: string;
  chapters: readonly ChapterMeta[];
  lastRead: string | null;
  cut: boolean;
}) {
  const { preface, groups, rest } = groupChapters(chapters);
  const count = tally(chapters, cut);
  const resume = chapters.find((c) => c.slug === lastRead) ?? null;
  const start = resume ?? preface ?? chapters[0] ?? null;

  const isUncut = (c: ChapterMeta) => c.tier === 'deep' && !cut;

  const row = (c: ChapterMeta) => (
    <li key={c.slug}>
      <Link
        href={chapterHref(bookId, c.slug)}
        className="group flex items-baseline justify-between gap-4 border-b jielan py-3 transition-colors duration-200 ease-ink"
      >
        <span className="font-serif tracking-[0.08em] text-ink-2 group-hover:text-ink">{c.title}</span>
        <span className="flex-none text-cap tracking-[0.14em]">
          {c.slug === lastRead ? (
            <span className="text-gold-ink">讀到這裡</span>
          ) : isUncut(c) ? (
            /* 未裁章照樣列出，唔收埋（架構 §6） */
            <span className="text-ink-3">未裁</span>
          ) : (
            <span aria-hidden="true" className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
              →
            </span>
          )}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="banxin flex flex-col gap-10">
      {/* 一、二：幾多章 ＋ 下一步 */}
      <div className="flex flex-col gap-6">
        <p className="text-lead leading-[1.9] text-ink-2">從命盤，慢慢認識自己。</p>
        <p className="text-cap tracking-[0.16em] text-ink-3" data-nums>
          共 {count.total} 章
          <span className="mx-3 text-rule">·</span>
          免費 {count.free} 章
          {count.uncut > 0 ? (
            <>
              <span className="mx-3 text-rule">·</span>未裁 {count.uncut} 章
            </>
          ) : (
            <>
              <span className="mx-3 text-rule">·</span>全書已裁開
            </>
          )}
        </p>
        {start ? (
          <div>
            <Link href={chapterHref(bookId, start.slug)} className="btn-mo">
              {resume ? `續讀《${resume.title}》` : `由《${start.title}》讀起`}
              <span className="btn-jiantou" aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}
      </div>

      {/* 三：序 */}
      {preface ? (
        <Link href={chapterHref(bookId, preface.slug)} className="ka flex items-center gap-4 p-5 sm:gap-5">
          <ThemeIcon kind="xu" />
          <span className="flex-1">
            <span className="block font-serif text-lead tracking-[0.12em] sm:text-h3">{preface.title}</span>
            <span className="mt-1 block text-sm tracking-[0.06em] text-ink-3">開卷：你的盤長甚麼樣子</span>
          </span>
          {preface.slug === lastRead ? (
            <span className="text-cap tracking-[0.14em] text-gold-ink">讀到這裡</span>
          ) : (
            <span aria-hidden="true" className="text-ink-3">›</span>
          )}
        </Link>
      ) : null}

      {/* 四：三個主題 */}
      <div className="flex flex-col gap-6">
        {groups.map(({ theme, chapters: list }) => (
          <section key={theme.key} aria-labelledby={`zhuti-${theme.key}`} className="ka p-5 sm:p-6">
            <header className="flex items-center gap-5">
              <ThemeIcon kind={theme.key} />
              <div>
                <h2 id={`zhuti-${theme.key}`} className="text-h3 font-medium tracking-[0.14em]">
                  {theme.title}
                </h2>
                <p className="mt-1 text-sm tracking-[0.06em] text-ink-3">{theme.lead}</p>
              </div>
            </header>
            <ul className="mt-4">{list.map(row)}</ul>
          </section>
        ))}

        {/* 安全網：認唔到嘅章唔會唔見（`groupChapters` 嘅 rest） */}
        {rest.length > 0 ? (
          <section aria-labelledby="zhuti-rest" className="ka p-5 sm:p-6">
            <h2 id="zhuti-rest" className="text-h3 font-medium tracking-[0.14em]">
              其餘各章
            </h2>
            <ul className="mt-4">{rest.map(row)}</ul>
          </section>
        ) : null}
      </div>

      {/* 「未裁」講一次，喺版尾 */}
      {count.uncut > 0 ? (
        <p className="border-t jielan pt-6 text-sm leading-[1.9] text-ink-3">
          標著「未裁」的章，是這本書還沒裁開的頁 —— 章名照樣列出，讀得到它有甚麼，只是還沒打開。
          裁一次，整本書的深度章都會開。
          <Link href={payHref(bookId)} className="lian ms-2 text-sm">
            關於裁書
          </Link>
        </p>
      ) : null}
    </div>
  );
}
