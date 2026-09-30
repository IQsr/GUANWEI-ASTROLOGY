'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Chart } from '@/components/Chart';
import { Zhanjuan } from '@/components/Zhanjuan';
import { GROW_MS } from '@/lib/timing';
import { usePathname } from 'next/navigation';
import { TurnEdges, type PageTurn } from '@/components/TurnEdges';
import { TURNING_ATTR } from '@/components/PageTurnLink';
import { OPENING_SLOT, chartStateAt, resolveSlot } from '@/lib/suidu';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { CHAPTER_LAYER, LAYER_KEYS, defaultLayer, hasLayer, layerMingIndex, layerOf, type ChartLayers, type LayerKey } from '@/lib/layers';

/**
 * 喺本書入面讀（書桌閱讀）
 *
 * 展卷之後唔再跳去一版紙色網頁：本書一直攤開喺桌面上。
 *
 *   左頁　命盤。讀章嗰陣跟住右頁讀緊嘅段落亮（即係之前「隨讀」嗰個
 *         260px 細盤，而家係成一頁）；目次嗰陣亮命宮。
 *   右頁　目次或者一章正文，喺頁入面捲。
 *
 * ── 跟讀 ──
 *
 * 同 `Suidu` 一樣嘅規矩：揀「壓住讀線嗰一段」，讀線 = 右頁可見高度三分一
 * （一個讀緊嘅人隻眼所在）。一條線都壓唔到（段落之間嘅空隙）就保住上一段，唔閃。
 * 分別係個捲動容器係右頁，唔係成個視窗。
 *
 * 手機：得右頁。命盤收喺頁頂一格，撳開先見。
 *
 * ── 撳左邊翻前、撳右邊翻後 ──
 *
 * 好似電子書咁：左頁左邊一條窄邊係上一頁，右頁右邊一條窄邊係下一頁；
 * ← → 鍵一樣。窄邊放喺頁邊留白入面 —— 唔蓋住字，亦唔蓋住右頁嘅捲動條。
 * 滑鼠移過去先見到一條影同一個箭嘴，平時唔搶眼。
 */

export type { PageTurn };

/** 一個盒喺視窗入面嘅位（`getBoundingClientRect()` 嗰四個數）。 */
export type Box = { left: number; top: number; width: number; height: number };

export function BookSpread({
  chart,
  layers = null,
  palace,
  follow = false,
  top,
  prev = null,
  next = null,
  from = null,
  children,
}: {
  chart: ZChart | null;
  /** 大限、流年兩層（server 計好）。null = 淨係本命，唔出切換。 */
  layers?: ChartLayers | null;
  /** 呢一章講邊一宮（亮邊格）。目次嗰陣畀「命宮」。 */
  palace: string;
  /** 跟住右頁讀緊嘅段落亮（讀章用）。 */
  follow?: boolean;
  /** 左頁頂嗰行（例如書名）。 */
  top?: ReactNode;
  /** 撳左邊（或者 ←）去邊。冇就唔出。 */
  prev?: PageTurn | null;
  /** 撳右邊（或者 →）去邊。冇就唔出。 */
  next?: PageTurn | null;
  /**
   * 由題名幕拎起（2026-09）：本書由呢個盒放大到自己嘅位，左頁個盤喺放大完之後
   * 先展卷（界欄逐條畫）。唔畀就一入嚟已經喺度。
   */
  from?: Box | null;
  children: ReactNode;
}) {
  const t = useTranslations('reading');
  const page = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLElement>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  /* 放大完未。冇 `from` 就一開始已經放大完 */
  const [grown, setGrown] = useState(from === null);
  const lifted = useRef(false);
  /*
   * 睇邊一層。一章打開停喺嗰章嘅層（〈這一年〉流年、〈這十年〉大限、其餘本命）；
   * 讀者揀咗就跟讀者，翻去下一章再由嗰章嘅層開始。
   */
  const [layer, setLayer] = useState<LayerKey>(() => defaultLayer(palace, layers));
  const [layerFor, setLayerFor] = useState(palace);
  if (layerFor !== palace) {
    setLayerFor(palace);
    setLayer(defaultLayer(palace, layers));
  }

  /*
   * 拎起：FLIP。本書一開始就排喺最終嗰個位，然後用 transform 縮返去題名幕嗰個盒，
   * 下一格先放手，由 transition 放大返嚟。量同改都要喺 paint 之前（layout effect），
   * 唔係會閃一格大書。
   */
  useLayoutEffect(() => {
    const el = book.current;
    if (!from || !el || lifted.current) return;
    lifted.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGrown(true);
      return;
    }
    const to = el.getBoundingClientRect();
    el.dataset.grow = '';
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    void el.getBoundingClientRect();
    el.style.transition = `transform ${GROW_MS}ms var(--ease-ink)`;
    el.style.transform = '';
    const land = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', land);
      el.style.transition = '';
      el.style.transformOrigin = '';
      delete el.dataset.grow;
      setGrown(true);
    };
    el.addEventListener('transitionend', land);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只喺第一次 render 拎起一次
  }, []);

  /*
   * 轉咗章（同一本書、同一個 DOM）：清走上一次翻頁嘅標記，右頁捲返去頂。
   * 由一章去下一章，Next 會重用呢個元件 —— 唔清嘅話頁紙會停喺翻咗一半，
   * 右頁會停喺上一章讀到嘅位置。
   */
  /*
   * ⚠ 跟網址，唔跟 `palace`：目次同命宮嗰章都係亮命宮，由目次翻去命宮 palace 冇變，
   * 翻頁嘅標記就會一直唔拎走（舊字永遠收埋）。
   */
  const pathname = usePathname();
  useEffect(() => {
    book.current?.removeAttribute(TURNING_ATTR);
    page.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    const root = page.current;
    if (!root || !follow) return;
    const paras = [...root.querySelectorAll<HTMLElement>('[data-slot]')];
    if (paras.length === 0) return;
    setLive(true);

    const pick = () => {
      const box = root.getBoundingClientRect();
      const line = box.top + box.height / 3;
      let best: HTMLElement | null = null;
      for (const el of paras) {
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) {
          best = el;
          break;
        }
      }
      if (!best) return;
      setSlot((prev) => resolveSlot(best?.dataset.slot ?? null, prev));
    };

    pick();
    const onScroll = () => window.requestAnimationFrame(pick);
    root.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [follow, children]);

  /* 〈這十年〉〈這一年〉讀緊嘅格係大限／流年命宮，唔係本命某宮 */
  const at = palace in CHAPTER_LAYER ? layerMingIndex(layers, CHAPTER_LAYER[palace]!) : undefined;
  const state = chart ? chartStateAt(chart, palace, live ? slot : OPENING_SLOT, at) : null;
  const shown = layerOf(layers, layer);
  const caption =
    layer === 'decadal' && layers?.decadal
      ? t('layerDecadalCap', { from: layers.decadal.fromAge, to: layers.decadal.toAge })
      : layer === 'annual' && layers
        ? t('layerAnnualCap', { year: layers.year, ganzhi: layers.ganzhi, age: layers.nominalAge })
        : null;

  const plate =
    chart && state ? (
      <Chart
        chart={chart}
        layer={shown}
        selected={state.selected}
        relations={state.relations}
        interactive={false}
        onSelect={() => {}}
        maxWidth={520}
        center={
          <>
            <p className="text-center font-sans text-cap tracking-[0.16em] text-ink-3">{palace}</p>
            {caption ? <p className="text-center font-sans text-cap tracking-[0.08em] text-cinnabar">{caption}</p> : null}
          </>
        }
      />
    ) : null;

  /* 本命／大限／流年。冇層（舊書、未起運）就唔出 */
  const tabs = layers ? (
    <div role="group" aria-label={t('layers')} className="pan-ceng">
      {LAYER_KEYS.filter((k) => hasLayer(layers, k)).map((k) => (
        <button key={k} type="button" aria-pressed={layer === k} onClick={() => setLayer(k)}>
          {t(k === 'natal' ? 'layerNatal' : k === 'decadal' ? 'layerDecadal' : 'layerAnnual')}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="shuzhuo">
      <article ref={book} className="shuzhuo-shu">
        {/* 撳左邊翻前、撳右邊翻後；← → 一樣 */}
        <TurnEdges prev={prev} next={next} />
        {/* 左頁：命盤。個盤 aria-hidden —— 盤面嘅資訊正文已經講晒，讀屏唔使讀兩次；揀層嗰排掣唔收 */}
        <div className="shuzhuo-ye shuzhuo-zuo">
          {top ? <div className="mb-6">{top}</div> : null}
          {tabs}
          <div aria-hidden="true" className="shuzhuo-pan" data-at={live ? (slot ?? '') : OPENING_SLOT}>
            {/*
             * 由題名幕拎起：放大完先展卷；之前唔畫（放大緊嗰陣字會拉扁），
             * 但個位要留定 —— 唔留嘅話左頁頂嗰行書名會企喺正中，盤一出就跳上頂。
             * 1 : 0.82 同展卷個骨架（`.zhan`）一樣。
             */}
            {from === null ? (
              plate
            ) : plate ? (
              <div className="mx-auto w-full" style={{ maxWidth: 520 }}>
                {grown ? <Zhanjuan>{plate}</Zhanjuan> : <div style={{ aspectRatio: '1 / 0.82' }} />}
              </div>
            ) : null}
          </div>
        </div>

        {/* 右頁：目次或者正文，喺頁入面捲 */}
        <div ref={page} className="shuzhuo-ye shuzhuo-you">
          {plate ? (
            <details className="shuzhuo-shouji mb-8">
              <summary className="cursor-pointer text-cap tracking-[0.16em] text-ink-3">{t('showChart')}</summary>
              <div className="mt-4">
                {tabs}
                {plate}
              </div>
            </details>
          ) : null}
          {children}
          {/* 跟讀：章尾留白，最後幾段先捲得上讀線 */}
          {follow ? <div className="shuzhuo-wei" aria-hidden="true" /> : null}
        </div>
      </article>
    </div>
  );
}
