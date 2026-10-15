'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { MARK, LATIN } from '@/lib/site';
import { BrandMark } from '@/components/BrandMark';
import { useQuiet } from '@/lib/quiet';

/**
 * 頁尾：全站一條（2026-10-15）
 *
 * 之前全站冇頁尾。導覽講「去邊」，頁尾講「呢度係乜」：
 * 品牌一句、派別出處、條款同私隱 —— 條款同私隱之前只喺
 * 落款前嘅 `ConsentGate` 出現，一個未落款嘅人搵唔到。
 *
 * ── 放乜 ──
 *
 *   左　星敘 / STELLOGUE ＋ 「以星為序，以你為章。」
 *   右　三組連結：閱讀（起盤・示範書・藏經閣）／你的書（書齋・設定）／條款
 *   底　派別出處 · 「參考讀物，唔係專業意見」· © 年份
 *
 * ⚠ 冇「關於」「聯絡」「社交」：未有頁、未有帳號。同導覽一樣 ——
 * 一粒撳落去乜都冇嘅掣，比冇粒掣更差。
 *
 * ── 唔出嘅地方 ──
 *
 *   命書同示範書章節（`/book/*`、`/sample/*`）：讀緊書，底下有
 *   `ChapterNav` 翻頁；一條頁尾喺書頁下面會變成「網站」，唔係「書」。
 *   題名幕（靜場）：同導覽一樣唔 render。
 *
 * ── 兩個樣 ──
 *
 *   夜色版（首頁、起盤、示範書封面、藏經閣、書齋、設定）：半透深底、夜色字。
 *   呢幾版背後都係暗相（夜景、經櫃、書桌）—— 一條紙白頁尾襯暗房好怪
 *   （Issac 講藏經閣白信箋嗰次一樣）。
 *   其餘（條款、私隱、認領、付款）：紙底，頂一條界欄，跟日夜讀。
 */

/** 背後係暗相嘅版（連子路徑）。首頁另計 —— `/` 做前綴乜都中。 */
const NIGHT = ['/cast', '/sample', '/lexicon', '/shelf', '/account'];

const GROUPS = [
  {
    key: 'read',
    links: [
      { href: '/cast', key: 'cast' },
      { href: '/sample', key: 'sample' },
      { href: '/lexicon', key: 'lexicon' },
    ],
  },
  {
    key: 'yours',
    links: [
      { href: '/shelf', key: 'shelf' },
      { href: '/account', key: 'account' },
    ],
  },
  {
    key: 'legal',
    links: [
      { href: '/terms', key: 'terms' },
      { href: '/privacy', key: 'privacy' },
    ],
  },
] as const;

export function SiteFooter() {
  const t = useTranslations('footer');
  const brand = useTranslations('brand');
  const pathname = usePathname();
  const quiet = useQuiet();

  if (quiet) return null;
  if (pathname.startsWith('/book/') || pathname.startsWith('/sample/')) return null;

  const overNight = NIGHT.some((n) => pathname === n || pathname.startsWith(`${n}/`)) || pathname === '/';

  return (
    <footer className="wei" data-over={overNight ? 'night' : undefined}>
      <div className="wei-nei">
        <div className="wei-shang">
          <div className="max-w-[22rem]">
            <Link href="/" className="inline-flex items-center gap-3 leading-none" aria-label={t('homeAria')}>
              <BrandMark size={28} className={overNight ? 'text-gilt' : 'text-gold-ink'} />
              <span className="flex flex-col">
                <span className="pin-tracking font-serif text-[1.125rem] font-medium tracking-[0.32em]">{MARK}</span>
                <span className="pin-tracking mt-1 font-latin text-[0.5625rem] tracking-[0.5em] opacity-80">{LATIN}</span>
              </span>
            </Link>
            <p className="wei-yu mt-5 font-serif text-sm leading-[1.9] tracking-[0.16em]">{brand('essence')}</p>
          </div>

          <nav aria-label={t('aria')} className="wei-zu">
            {GROUPS.map((g) => (
              <div key={g.key}>
                <p className="wei-biao">{t(`groups.${g.key}`)}</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="wei-lian">
                        {t(`links.${l.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="wei-xia">
          <p>{t('school')}</p>
          <p>{t('notAdvice')}</p>
          <p className="font-latin" data-nums>
            © {new Date().getFullYear()} {MARK} {LATIN}
          </p>
        </div>
      </div>
    </footer>
  );
}
