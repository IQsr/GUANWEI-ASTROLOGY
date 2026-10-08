'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { hasConsented, LEGAL_VERSION } from '@/lib/legal';
import { readLocal, writeLocal } from '@/lib/local';

/**
 * 條款及私隱政策同意（2026-09-29 · Issac：起盤之前彈窗）
 *
 * ── 點解喺起盤，唔喺首頁 ──
 *
 * 首頁同藏經閣唔收任何資料，而且藏經閣係搜尋器入口（D1）—— 擋住佢哋冇意思。
 * 真正收資料嗰一刻係寫生辰，所以喺嗰一刻之前問。
 *
 * ── 同意咗點記 ──
 *
 * 呢部瀏覽器記住版本（`gw-consent`），唔會每次都彈；
 * 成書嗰陣版本跟住本書寫落 DB（0011），server 同 DB 都會再查一次 —— 呢度只係第一層。
 * 私密視窗記唔到 localStorage：照樣可以同意、照樣成書，只係下次再問。
 *
 * ⚠ 唔係 cookie banner：網站只有兩個必要 cookie（docs/privacy.md 第二節），唔使 cookie 同意。
 */
export function ConsentGate({ onConsent }: { onConsent: () => void }) {
  const t = useTranslations('consent');
  const [open, setOpen] = useState(false);
  const accept = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasConsented(readLocal('consent'))) onConsent();
    else setOpen(true);
    // 只喺開頭睇一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) accept.current?.focus();
  }, [open]);

  if (!open) return null;

  const agree = () => {
    writeLocal('consent', LEGAL_VERSION);
    setOpen(false);
    onConsent();
  };

  /*
   * ⚠ 掛喺 body（portal），唔喺落款頁入面（2026-10-08，iPhone 日讀撞到）：
   *   一、落款頁係 `.ye-ink` 夜景，將 `--ink` 改咗做淺色 —— 張卡跟住佢就淺字淺底，一片空白。
   *   二、落款頁自己係一層 z-index，張卡困喺入面，幾高 z 都蓋唔過頁頭。
   * 卡太高（英文、細手機）就成個遮罩捲，唔好俾頂同底切走。
   */
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgb(0_0_0/0.55)]">
      <div className="flex min-h-full items-center justify-center px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full max-w-[30rem] bg-[var(--paper)] p-8 text-[var(--ink)] shadow-2xl"
      >
        <h2 id="consent-title" className="text-h2 font-semibold tracking-[0.12em]">
          {t('title')}
        </h2>
        <ul className="mt-6 flex list-disc flex-col gap-3 pl-5 text-body leading-[1.9] text-ink-2">
          <li>{t('point1')}</li>
          <li>{t('point2')}</li>
          <li>{t('point3')}</li>
        </ul>
        <p className="mt-6 text-body leading-[1.9]">
          {t.rich('read', {
            terms: (chunks) => (
              <Link href="/terms" target="_blank" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" target="_blank" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <button ref={accept} type="button" onClick={agree} className="btn-mo">
            {t('agree')}
          </button>
          <Link href="/" className="font-sans text-cap tracking-[0.16em] text-ink-3">
            {t('back')}
          </Link>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}
