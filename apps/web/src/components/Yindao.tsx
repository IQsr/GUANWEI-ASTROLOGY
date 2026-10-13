'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { readLocal, writeLocal } from '@/lib/local';

/**
 * 第一次打開本書嘅引導（2026-10-13 · Issac：「話畀佢知頁數可以拉落去，同埋可以翻頁」）
 *
 * 兩張紙箋，各自指住一樣嘢：
 *
 *   捲　右頁底（手機：屏底）一張「向下捲動，繼續閱讀」，個箭嘴輕輕郁。
 *       讀者捲咗一段就自己收起。
 *   翻　下一頁嗰條窄邊旁邊一張「點書頁右緣，翻到下一頁」，窄邊同時亮起、輕輕閃。
 *       讀者撳過窄邊、用過 ← →，或者撳「知道了」就收起。
 *
 * 學識咗嗰樣記低（`lib/local.ts` 嘅 `yindao`），以後唔再出。私密視窗記唔到 —— 下次再出，冇壞。
 *
 * ⚠ 用 portal 放喺 body、fixed 定位，位置每次捲動／改大細都按真實嘅頁同窄邊再度：
 * 桌面係右頁入面捲，手機係成頁捲（globals.css 尾），兩種都啱。
 * 唔放喺本書入面 —— `.shuzhuo-shu` 有 perspective，fixed 會變咗跟本書定位。
 */

type Learned = { scroll?: boolean; flip?: boolean };

function readLearned(): Learned {
  try {
    return JSON.parse(readLocal('yindao') ?? '{}') as Learned;
  } catch {
    return {};
  }
}

function saveLearned(l: Learned) {
  writeLocal('yindao', JSON.stringify(l));
}

/** 等本書開完場先出（展卷、放大），唔同開場動畫爭。 */
const DELAY_MS = 1200;
/** 捲過幾多就當學識咗捲。 */
const SCROLLED_PX = 80;

type Spot = { x: number; y: number };

export function Yindao({
  book,
  page,
  hasNext,
  pathname,
  ready,
}: {
  book: RefObject<HTMLElement | null>;
  page: RefObject<HTMLElement | null>;
  hasNext: boolean;
  pathname: string;
  /** 本書放大完未（由題名幕拎起嗰陣要等）。 */
  ready: boolean;
}) {
  const t = useTranslations('reading');
  const [learned, setLearned] = useState<Learned | null>(null);
  const [scrollSpot, setScrollSpot] = useState<Spot | null>(null);
  const [flipSpot, setFlipSpot] = useState<Spot | null>(null);
  const [mobile, setMobile] = useState(false);

  /* 開場之後先讀記錄、先出 */
  useEffect(() => {
    if (!ready || learned) return;
    const id = window.setTimeout(() => {
      setLearned(readLearned());
    }, DELAY_MS);
    return () => window.clearTimeout(id);
  }, [ready, learned]);

  const learn = (part: Learned) => {
    setLearned((prev) => {
      const next = { ...prev, ...part };
      saveLearned(next);
      return next;
    });
  };

  const showScroll = Boolean(learned && !learned.scroll);
  const showFlip = Boolean(learned && !learned.flip && hasNext);

  /*
   * 撳過窄邊、或者用過 ← → ＝ 學識翻。
   * ⚠ 唔好用「網址變咗」嚟估：轉章嗰陣成個元件可能重新 mount，記唔住開頭個網址。
   */
  useEffect(() => {
    if (!showFlip) return;
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('.shuzhuo-bian')) learn({ flip: true });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') learn({ flip: true });
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- learn 每次 render 都係新嘅，唔使跟
  }, [showFlip]);

  /* 窄邊亮起（CSS：.shuzhuo-shu[data-yindao]） */
  useEffect(() => {
    const el = book.current;
    if (!el) return;
    if (showFlip) el.setAttribute('data-yindao', '');
    else el.removeAttribute('data-yindao');
    return () => el.removeAttribute('data-yindao');
  }, [showFlip, book]);

  /* 度位：右頁底、下一頁窄邊個箭嘴；捲夠就學識捲 */
  useEffect(() => {
    if (!showScroll && !showFlip) return;
    const mq = window.matchMedia('(max-width: 899px)');
    let raf = 0;
    const baseY = window.scrollY;

    const measure = () => {
      raf = 0;
      const p = page.current;
      const b = book.current;
      if (!p || !b) return;
      const small = mq.matches;
      setMobile(small);
      const vh = window.innerHeight;

      if (showScroll) {
        /* 手機成頁捲：同出嗰陣嘅位比；桌面右頁自己捲 */
        const scrolled = small ? window.scrollY - baseY > SCROLLED_PX : p.scrollTop > SCROLLED_PX;
        const room = small ? b.getBoundingClientRect().bottom - vh : p.scrollHeight - p.clientHeight - p.scrollTop;
        if (scrolled) {
          learn({ scroll: true });
        } else if (room < SCROLLED_PX) {
          /* 冇嘢好捲（例如好短嘅一頁）：唔出，亦唔記低 —— 下一頁再教 */
          setScrollSpot(null);
        } else {
          const r = p.getBoundingClientRect();
          setScrollSpot({ x: r.left + r.width / 2, y: Math.min(r.bottom, vh) - 20 });
        }
      }

      if (showFlip) {
        const arrow = b.querySelector<HTMLElement>('.shuzhuo-bian-you > span');
        const edge = b.querySelector<HTMLElement>('.shuzhuo-bian-you');
        const r = (arrow ?? edge)?.getBoundingClientRect();
        const er = edge?.getBoundingClientRect();
        if (r && er && r.height > 0) setFlipSpot({ x: er.left - 10, y: Math.min(Math.max(r.top + r.height / 2, 80), vh - 140) });
        else setFlipSpot(null);
      }
    };

    const queue = () => {
      /* 捲夠未即刻睇（唔等下一格畫面）；度位先等 rAF */
      const p = page.current;
      if (showScroll && p) {
        const scrolled = mq.matches ? window.scrollY - baseY > SCROLLED_PX : p.scrollTop > SCROLLED_PX;
        if (scrolled) learn({ scroll: true });
      }
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    const p = page.current;
    p?.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    const ro = new ResizeObserver(queue);
    if (p) ro.observe(p);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      p?.removeEventListener('scroll', queue);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- learn 每次 render 都係新嘅，唔使跟
  }, [showScroll, showFlip, page, book, pathname]);

  /* Esc 收晒 */
  useEffect(() => {
    if (!showScroll && !showFlip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') learn({ scroll: true, flip: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScroll, showFlip]);

  if (typeof document === 'undefined' || (!showScroll && !showFlip)) return null;

  return createPortal(
    <div className="yindao" role="region" aria-label={t('guideLabel')}>
      {showScroll && scrollSpot ? (
        <div className="yindao-jian yindao-juan" style={{ left: scrollSpot.x, top: scrollSpot.y }}>
          <p>{t('guideScroll')}</p>
          <span className="yindao-xia" aria-hidden="true">↓</span>
        </div>
      ) : null}
      {showFlip && flipSpot ? (
        <div className="yindao-jian yindao-fan" style={{ right: document.documentElement.clientWidth - flipSpot.x, top: flipSpot.y }}>
          <p>{t(mobile ? 'guideFlipTouch' : 'guideFlip')}</p>
          <p className="yindao-ci">{t(mobile ? 'guideFlipTouchMore' : 'guideFlipMore')}</p>
          <button type="button" onClick={() => learn({ scroll: true, flip: true })}>
            {t('guideGotIt')}
          </button>
          <span className="yindao-you" aria-hidden="true">›</span>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
