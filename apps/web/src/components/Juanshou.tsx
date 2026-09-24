import { Link } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * 卷首：全站唯一嘅頁頭（工單 UX1 · 視覺系統 §5 · 架構 §2）
 *
 * ── 點解要抽出嚟 ──
 *
 * 做到 G4 為止，七版頁各自寫咗一次頁頭，結果係**四款**：
 *
 *   /cast              一條橫欄：← 書齋（左）· 夜讀（右）· 界欄
 *   /shelf             h1 ＋ 行內 nav ＋ 界欄，冇返回、冇夜讀
 *   /book /pay /claim  一條光禿禿嘅 ←，冇界欄、冇夜讀
 *   /lexicon /         乜都冇
 *
 * 每一款單獨睇都合理。加埋就係「唔夠連貫」—— 而且每開一版新頁，
 * 寫嗰個人要由零再揀一次，所以只會越揀越散。
 *
 * ── 三行，次序固定 ──
 *
 *   一　返回（左）· 夜讀（右）
 *   二　章名 ＋ 細 nav
 *   三　界欄
 *
 * 第二行冇嘢就唔出（讀緊一章嗰陣，頁頭唔應該同正文爭）。
 * 第三行永遠出 —— 佢係「頁頭到此為止」嗰條線，全站同一個位。
 */

/**
 * ⚠ 返回嘅去處同名，全站喺呢度寫一次。
 *
 * 之前 `/claim` 寫「← 書架」而其餘寫「← 書齋」—— 同一個地方兩個名。
 * E3 嗰張工單記錄明寫「書齋同書架係同一個地方」，但名散喺六個檔，
 * 所以改一個唔會改到其餘五個。
 */
export const BACK = {
  shelf: { href: '/shelf', label: '書齋' },
  lexicon: { href: '/lexicon', label: '藏經閣' },
} as const;

export type BackTo = keyof typeof BACK;

/**
 * 返回一本書嘅目次。
 *
 * ⚠ 唔喺 `BACK` 嗰張表 —— 佢要 bookId，所以佢唔係一個固定去處。
 * 但個名（「目次」）一樣只喺呢度寫一次。
 */
export function backToContents(bookId: string) {
  return { href: `/book/${bookId}`, label: '目次' } as const;
}

/**
 * 細 nav（架構 §2）。
 *
 * 「全站冇 header nav。只有 `/shelf` 同 `/book/*` 有三個字嘅細 nav：
 * 書架 · 藏經閣 · 設定。」
 *
 * ⚠ 而家嗰個位**只做咗一半**：書齋有（兩條），命書冇。
 * 即係入咗本書就冇路去藏經閣或者設定，要撳返書齋先去得到。
 *
 * 企緊嗰度嗰個唔出連結 —— 一個指住自己嘅連結係一個要人試一次先知
 * 冇用嘅掣。
 */
const NAV = [
  { at: 'shelf', href: '/shelf', label: '書齋' },
  { at: 'lexicon', href: '/lexicon', label: '藏經閣' },
  { at: 'account', href: '/account', label: '設定' },
] as const;

export type NavAt = (typeof NAV)[number]['at'];

export function Juanshou({
  back,
  title,
  nav,
  theme = false,
}: {
  back?: BackTo | { href: string; label: string };
  title?: string;
  /** 出細 nav，而且標明企緊邊度（企緊嗰個唔出連結）。 */
  nav?: NavAt | 'book';
  theme?: boolean;
}) {
  const to = typeof back === 'string' ? BACK[back] : (back ?? null);
  const hasRowOne = Boolean(to || theme);
  const hasRowTwo = Boolean(title || nav);

  return (
    <header className="banxin mb-10 border-b jielan pb-5">
      {hasRowOne ? (
        <div className="flex items-center justify-between gap-6">
          {to ? (
            <Link
              href={to.href}
              className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
            >
              ← {to.label}
            </Link>
          ) : (
            <span />
          )}
          {theme ? <ThemeToggle dayLabel="日讀" nightLabel="夜讀" /> : null}
        </div>
      ) : null}

      {hasRowTwo ? (
        <div
          className={`flex flex-wrap items-baseline gap-x-8 gap-y-3 ${hasRowOne ? 'mt-6' : ''}`}
        >
          {title ? (
            /* ⚠ 字距 .16em —— 幕標題（視覺系統 §4）。全站同一個值。 */
            <h1 className="text-h1 font-semibold tracking-[0.16em]">{title}</h1>
          ) : null}
          {nav ? (
            <nav className="flex gap-6 font-sans text-cap tracking-[0.18em] text-ink-3">
              {NAV.filter((n) => n.at !== nav).map((n) => (
                <Link
                  key={n.at}
                  href={n.href}
                  className="transition-colors duration-200 ease-ink hover:text-ink-2"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
