'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { MARK, LATIN } from '@/lib/site';
import { useQuiet, useQuietBack } from '@/lib/quiet';

/**
 * 頁頂導覽：全站一條（重新設計第一期）
 *
 * ⚠ 取代咗架構 §2「全站冇 header nav」同 E1「入齋唯一出口」。
 * Issac 2026-09 揀咗全站都有：之前每一版單獨睇都完整，但讀者
 * 由一版去下一版就唔見咗條線 —— 一條永遠喺度嘅導覽就係嗰條線。
 *
 * ── 放乜 ──
 *
 *   左　星敘 / STELLOGUE（返首頁）
 *   中　首頁 · 起盤 · 藏經閣
 *   右　語言（中 / EN）· 日夜讀 · 「我的書齋」
 *
 * ⚠ 右邊唔係「登入／註冊」。觀微係匿名先用：唔使註冊都排得到盤，
 * 認領（留電郵）喺書齋入面提。寫「登入」會令人以為要先有帳戶。
 *
 * ⚠ 冇「搜尋」同「關於」：兩樣都未有頁。一粒撳落去乜都冇嘅掣，
 * 比冇粒掣更差。有頁嗰日再加返入 `NAV`。
 *
 * ── 兩個樣 ──
 *
 *   首頁：透明，疊喺夜景上面（`data-over="night"` ＋ `data-float`）
 *   落款、命書：透明、夜色字，但照舊黏喺頂佔位（背後係固定嘅夜景）
 *   其餘：黏喺頂、紙底半透
 *
 * ⚠ 命書（`/book/*`）以前係紙底嗰款：由題名幕「讀下去」入目次，
 * 導覽由夜色跳做紙色，同本書一齊郁 —— 睇落似換咗個網站（2026-09 改）。
 * 兩版背後都係同一張夜景書桌，所以導覽都用同一款。
 */

/* 名喺 messages：`nav.*` */
const NAV = [
  { href: '/', key: 'home' },
  { href: '/cast', key: 'cast' },
  { href: '/lexicon', key: 'lexicon' },
] as const;

/** 呢啲路徑開頭嘅頁，導覽當佢屬於邊一格（例如詞條頁亮「藏經閣」）。 */
function isAt(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const t = useTranslations('nav');
  const tt = useTranslations('theme');
  const pathname = usePathname();
  /* 首頁同落款都係夜景：透明、夜色字。只有首頁疊喺相上面唔佔位。 */
  const onHome = pathname === '/';
  const onBook = pathname.startsWith('/book/');
  const overNight = onHome || pathname === '/cast' || onBook;
  const [open, setOpen] = useState(false);
  const quiet = useQuiet();
  const back = useQuietBack();

  /* 換咗版就收埋個選單 */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* 題名幕：成條導覽唔 render（見 lib/quiet.ts） */
  if (quiet) return null;

  return (
    <>
      <header
        className="dao"
        data-over={overNight ? 'night' : undefined}
        data-float={onHome ? '' : undefined}
        data-back={back ? '' : undefined}
      >
        <div className="dao-nei">
          <Link href="/" className="flex flex-col leading-none" aria-label={t('homeAria')}>
            <span className="font-serif text-[1.375rem] font-medium md:text-[1.625rem] tracking-[0.32em]">{MARK}</span>
            <span className="mt-1.5 font-latin text-[0.625rem] tracking-[0.5em] opacity-80">{LATIN}</span>
          </Link>

          <nav aria-label={t('main')} className="hidden items-center gap-12 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="dao-lian"
                aria-current={isAt(pathname, n.href) ? 'page' : undefined}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* 語言：桌面喺度，手機喺選單入面 */}
            <span className="hidden md:inline-flex">
              <LocaleSwitch />
            </span>
            {/*
             * 首頁同落款唔出日夜讀：永遠係夜、本書永遠係紙，撳咗都見唔到分別。
             * 命書要出 —— 夜讀轉嘅係書頁。
             */}
            {overNight && !onBook ? null : (
              <span className="dao-ye hidden sm:inline-flex">
                <ThemeToggle dayLabel={tt('day')} nightLabel={tt('night')} />
              </span>
            )}
            <Link
              href="/shelf"
              className="dao-shu"
              aria-current={isAt(pathname, '/shelf') ? 'page' : undefined}
            >
              {t('myShelf')}
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 flex-col items-center justify-center gap-[6px] md:hidden"
              aria-expanded={open}
              aria-controls="dao-mian"
              aria-label={open ? t('menuClose') : t('menuOpen')}
              onClick={() => setOpen((v) => !v)}
            >
              <i className={`block h-px w-6 bg-current transition-transform duration-200 ${open ? 'translate-y-[3.5px] rotate-45' : ''}`} />
              <i className={`block h-px w-6 bg-current transition-transform duration-200 ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/*
       * ⚠ 手機選單要喺 <header> 外面。
       *
       * 導覽條有 `backdrop-filter`（半透模糊底），而 backdrop-filter 會令入面
       * `position: fixed` 嘅嘢改為以導覽條定位，唔再以視窗定位 ——
       * 選單會被困喺條 72px 高嘅導覽入面，同版面疊埋。第一期冇發現，
       * 因為首頁條導覽冇 backdrop-filter，而我只喺首頁撳過個選單。
       */}
      {open ? (
        <nav id="dao-mian" aria-label={t('main')} className="dao-mian md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isAt(pathname, n.href) ? 'page' : undefined}>
              {t(n.key)}
            </Link>
          ))}
          <Link href="/shelf">{t('myShelf')}</Link>
          <Link href="/account">{t('account')}</Link>
          <div className="mt-6 flex flex-col gap-5">
            <LocaleSwitch layout="list" />
            <ThemeToggle dayLabel={tt('day')} nightLabel={tt('night')} />
          </div>
        </nav>
      ) : null}
    </>
  );
}
