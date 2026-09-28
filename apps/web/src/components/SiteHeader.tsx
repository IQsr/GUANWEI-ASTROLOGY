'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MARK } from '@/lib/site';
import { useQuiet } from '@/lib/quiet';

/**
 * 頁頂導覽：全站一條（重新設計第一期）
 *
 * ⚠ 取代咗架構 §2「全站冇 header nav」同 E1「入齋唯一出口」。
 * Issac 2026-09 揀咗全站都有：之前每一版單獨睇都完整，但讀者
 * 由一版去下一版就唔見咗條線 —— 一條永遠喺度嘅導覽就係嗰條線。
 *
 * ── 放乜 ──
 *
 *   左　觀微 / GUAN WEI（返首頁）
 *   中　首頁 · 起盤 · 藏經閣
 *   右　日夜讀 · 「我的書齋」
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
 *   落款：透明、夜色字，但照舊黏喺頂佔位（背後係固定嘅夜景）
 *   其餘：黏喺頂、紙底半透
 */

const NAV = [
  { href: '/', label: '首頁' },
  { href: '/cast', label: '起盤' },
  { href: '/lexicon', label: '藏經閣' },
] as const;

/** 呢啲路徑開頭嘅頁，導覽當佢屬於邊一格（例如詞條頁亮「藏經閣」）。 */
function isAt(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  /* 首頁同落款都係夜景：透明、夜色字。只有首頁疊喺相上面唔佔位。 */
  const onHome = pathname === '/';
  const overNight = onHome || pathname === '/cast';
  const [open, setOpen] = useState(false);
  const quiet = useQuiet();

  /* 換咗版就收埋個選單 */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* 題名幕：成條導覽唔 render（見 lib/quiet.ts） */
  if (quiet) return null;

  return (
    <header className="dao" data-over={overNight ? 'night' : undefined} data-float={onHome ? '' : undefined}>
      <div className="dao-nei">
        <Link href="/" className="flex flex-col leading-none" aria-label={`${MARK} 首頁`}>
          <span className="font-serif text-[1.625rem] font-medium tracking-[0.32em]">{MARK}</span>
          <span className="mt-1.5 font-latin text-[0.625rem] tracking-[0.5em] opacity-80">GUAN WEI</span>
        </Link>

        <nav aria-label="主要" className="hidden items-center gap-12 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="dao-lian"
              aria-current={isAt(pathname, n.href) ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* 夜景上面唔出日夜讀：首頁同落款永遠係夜、本書永遠係紙，撳咗都見唔到分別 */}
          {overNight ? null : (
            <span className="hidden sm:inline-flex">
              <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
            </span>
          )}
          <Link
            href="/shelf"
            className="dao-shu"
            aria-current={isAt(pathname, '/shelf') ? 'page' : undefined}
          >
            我的書齋
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 flex-col items-center justify-center gap-[6px] md:hidden"
            aria-expanded={open}
            aria-controls="dao-mian"
            aria-label={open ? '收起選單' : '打開選單'}
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`block h-px w-6 bg-current transition-transform duration-200 ${open ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <i className={`block h-px w-6 bg-current transition-transform duration-200 ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {open ? (
        <nav id="dao-mian" aria-label="主要" className="dao-mian md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isAt(pathname, n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
          <Link href="/shelf">我的書齋</Link>
          <Link href="/account">設定</Link>
          <div className="mt-6">
            <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
