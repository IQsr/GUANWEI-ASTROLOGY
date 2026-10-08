'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { LOCALE_LABEL } from '@/lib/locales';

/**
 * 語言切換（頁頂導覽）
 *
 * 之前全站冇切換掣：第一次入嚟跟瀏覽器語言揀，之後 `NEXT_LOCALE` cookie
 * 記住 —— 瀏覽器係英文嘅人一入嚟就係 `/en`，而且冇辦法喺介面入面轉返中文。
 *
 * 轉嘅時候行 next-intl 嘅 `router.replace(…, { locale })`：同一版、
 * 同一個 query（例如落款嘅 `?step=`），只係換語言。cookie 由 middleware
 * 喺新語言嗰個 request 度更新，之後入 `/` 就記得。
 *
 * ── 兩個樣，跟語言數目自動揀 ──
 *
 *   兩種：「中 / EN」，企緊嗰個亮，撳另一個就轉
 *   多過兩種：一粒掣顯示而家嗰種，撳開一張清單（韓文、日文加入之後）
 *
 * ⚠ 藏經閣永遠係中文（詞條原文逐字抄自原書，見 middleware），
 * 喺嗰度轉英文會留返喺中文版 —— 唔係壞咗。
 */
export function LocaleSwitch({ layout = 'inline' }: { layout?: 'inline' | 'list' }) {
  const current = useLocale() as Locale;
  /* 掣嘅名兩種文字都寫，等睇唔明而家呢種語言嘅人都認得出；簡體頁用简体字 */
  const groupLabel = current === 'zh-Hans' ? '语言 · Language' : '語言 · Language';
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const go = (locale: Locale) => {
    setOpen(false);
    if (locale === current) return;
    /*
     * ⚠ 撳嗰一刻先讀 query，唔用 `useSearchParams()`：呢個掣住喺全站 layout，
     * 用咗佢 Next 會要成棵樹包一層 Suspense，唔係靜態頁 build 唔過。
     */
    const query = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    router.replace({ pathname, query }, { locale });
  };

  /* 撳出面就收埋清單 */
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const locales = routing.locales;

  /* 手機選單入面：每種語言一行，用全名 */
  if (layout === 'list') {
    return (
      <div role="group" aria-label={groupLabel} className="flex flex-wrap gap-3">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={l === current}
            onClick={() => go(l)}
            className={`btn-jie ${l === current ? 'border-gold text-ink' : ''}`}
          >
            {LOCALE_LABEL[l].name}
          </button>
        ))}
      </div>
    );
  }

  /* 兩種語言：中 / EN */
  if (locales.length <= 2) {
    return (
      <div role="group" aria-label={groupLabel} className="flex items-center gap-1.5 font-sans text-cap tracking-[0.12em]">
        {locales.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span aria-hidden="true" className="opacity-40">
                /
              </span>
            ) : null}
            <button
              type="button"
              lang={l}
              aria-pressed={l === current}
              aria-label={LOCALE_LABEL[l].name}
              onClick={() => go(l)}
              className={`px-1 py-1 transition-opacity duration-200 ${
                l === current ? 'border-b border-gold opacity-100' : 'opacity-55 hover:opacity-100'
              }`}
            >
              {LOCALE_LABEL[l].short}
            </button>
          </span>
        ))}
      </div>
    );
  }

  /* 多過兩種：一粒掣 ＋ 一張清單 */
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${groupLabel}：${LOCALE_LABEL[current].name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-1 py-1 font-sans text-cap tracking-[0.12em] opacity-80 hover:opacity-100"
      >
        {LOCALE_LABEL[current].short}
        <span aria-hidden="true" className="text-[0.6rem]">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={groupLabel}
          className="ka absolute end-0 top-full z-30 mt-2 min-w-40 py-2 text-ink"
        >
          {locales.map((l) => (
            <li key={l} role="option" aria-selected={l === current}>
              <button
                type="button"
                lang={l}
                onClick={() => go(l)}
                className={`block w-full px-4 py-2 text-start text-sm tracking-[0.06em] hover:bg-gold-wash ${
                  l === current ? 'text-gold-ink' : ''
                }`}
              >
                {LOCALE_LABEL[l].name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
