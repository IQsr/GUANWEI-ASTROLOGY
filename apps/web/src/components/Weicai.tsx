import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cutTarget, deckle, notches } from '@/lib/weicai';

/**
 * 未裁之頁（工單 F4 · 架構 §6）
 *
 * ⚠ 呢個 component 冇 state、冇 effect、冇 JS。
 *
 * 佢係一版紙。一版紙唔需要 hydrate；冇 modal、冇倒數，所以佢冇任何嘢要郁。
 *
 * 2026-11-10（Issac 拍板，推翻舊規矩「冇糊咗嘅正文」）：未裁章先俾結論段，下面用糊咗嘅**假字**示意後面仲有原因、細讀、建議。
 * ⚠ 糊住嘅唔係正文：係messages `weicai.filler1–3` 嘅固定假字。真正文冇送去瀏覽器（DB `chapter_body()` 照舊要票），
 *   所以撳開 devtools、拎走 blur 都讀唔到內容。結論段嚟自 0008 `chapter_leads()`（只開第一段）。
 */
/** 假字三行，喺 messages `weicai.filler1–3`。 */
const FILLER_KEYS = ['filler1', 'filler2', 'filler3'] as const;

export function Weicai({
  title,
  slots,
  lead,
  bookId,
  slug,
  isAnonymous,
}: {
  title: string;
  /** 呢一版有幾多格、係乜嘢格。⚠ 格嘅名唔係內容（0006）。 */
  slots: readonly string[];
  /** 已按 locale 轉好嘅結論段；冇就照舊淨係一版未裁嘅紙。 */
  lead?: string | null;
  bookId: string;
  slug: string;
  isAnonymous: boolean;
}) {
  const t = useTranslations('weicai');
  const target = cutTarget(bookId, isAnonymous, slug);
  /*
   * 格名（2026-11-11）：DB 存嘅係中文內部格名（結論、細讀、今年的錢…）。中文照舊直接出（呢個 component 亦喺 client 用，唔可以 import server-only 嘅 hans）；英日用 messages `weicai.slots` 譯名；
   * 冇譯名嘅格英日唔出名（只留格），唔好喺英日頁漏中文。
   */
  const locale = useLocale();
  const zh = locale.startsWith('zh');
  const labels = slots.map((s) => (zh ? s : t.has(`slots.${s}`) ? t(`slots.${s}`) : ''));

  return (
    <div className="weicai">
      {lead ? (
        <div className="weicai-lead">
          <p className="font-sans text-cap tracking-[0.2em] text-ink-3">{t('leadLabel')}</p>
          <p className="mt-4 max-w-banxin text-body leading-[1.95] text-ink">{lead}</p>
          {/* 假字，唔係正文：讀屏器同複製都唔會攞到 */}
          <div className="weicai-mo mt-8" aria-hidden="true">
            {FILLER_KEYS.map((k) => (
              <p key={k} className="text-body leading-[1.95] text-ink-2">{t(k)}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`weicai-zhi${lead ? ' mt-8' : ''}`} style={{ ['--mao' as string]: deckle(notches(slots.length)) }}>
        <p className="font-sans text-cap tracking-[0.2em] text-ink-3">{title}</p>

        <p className="mt-5 max-w-banxin text-body leading-[1.95] text-ink-2">
          {lead ? t('restNotYet') : t('notYet')}
        </p>

        {slots.length > 0 ? (
          <ul className="weicai-ge mt-8">
            {slots.map((slot, i) => (
              <li key={`${slot}-${i}`}>
                <span>{labels[i]}</span>
                <i aria-hidden="true" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/*
        * ⚠ 一行細字，唔係一粒掣。
        *
        * 「裁開」係一個動作嘅名，唔係「升級」「解鎖」「立即購買」。
        * 而且佢喺紙外面 —— 一版未裁開嘅紙上面唔會印住點樣買佢。
        */}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href={target.href} className="btn-mo">
          {t('cut')}
          <span className="btn-jiantou" aria-hidden="true">→</span>
        </Link>
        {/* 裁開之前講清楚會發生乜：一次過、成本書、唔係逐章 */}
        <p className="text-cap leading-[1.9] tracking-[0.08em] text-ink-3">
          {isAnonymous ? t('hintAnonymous') : t('hintClaimed')}
        </p>
      </div>
    </div>
  );
}
