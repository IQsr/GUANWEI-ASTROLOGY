"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BookFlip } from "@/components/BookFlip";
import { PageTurnLink } from "@/components/PageTurnLink";
import { Juanshou } from "@/components/Juanshou";
import { BookSpread, type Box } from "@/components/BookSpread";
import { Seal } from "@/components/Seal";
import { INK_MS, NAMING_MS, SEAL_DELAY_MS } from "@/lib/timing";
import { MARK, LATIN } from "@/lib/site";
import { BrandMark } from "@/components/BrandMark";
import { LIFE_PALACE } from "@/lib/suidu";
import { bookTitle } from "@/lib/chengshu";
import { setQuiet } from "@/lib/quiet";
import type { Preface } from "@/app/[locale]/cast/actions";
import type { Chart as ZChart } from "@guanwei/ziwei/contract";

/**
 * 合書題名（工單 E5 · 視覺系統 §9）
 *
 * 落款完成 → 排盤 → **書合埋** → 封面浮出個名 → 落印。
 *
 * ── ⚠ 兩條驗收標準睇落打交 ──
 *
 *   「呢一幕**冇任何掣** —— 用戶淨係睇」
 *   「**唔自動翻開**，一定要用戶自己撳」
 *
 * 冇掣，噉撳乜？
 *
 * 答案係：**撳本書。** 一本書唔係靠一粒「開啟」掣打開嘅，
 * 你伸手揭佢。所以呢一幕由頭到尾一粒掣都冇，而成幕行完之後，
 * 本書自己變成唯一撳得嘅嘢。
 *
 * 兩條 AC 唔係打交 —— 佢哋加埋講緊同一件事：
 * **呢一幕唔可以有任何界面。**
 *
 * ── 點解用 CSS animation-delay，唔用 setTimeout ──
 *
 * 時序寫喺 CSS，`prefers-reduced-motion` 一關就全部唔套用，
 * 三樣嘢即刻齊齊整整咁喺度 —— 而唔係一個「快咗嘅版本」。
 * 用 JS timer 就要另外寫一套 reduced-motion 嘅路。
 */
export function Naming({
  name,
  chart,
  bookId,
  preface,
}: {
  name: string;
  chart: ZChart | null;
  /** null = 冇寫落 DB。冇 id 就冇書齋入口 —— 唔好扮有（架構 §8）。 */
  bookId: string | null;
  /** 序嘅章名同章首，由 server 帶過嚟（見 cast/actions.ts）。 */
  preface: Preface | null;
}) {
  /* 成幕行完之前，本書撳唔郁。 */
  const t = useTranslations("naming");
  const tr = useTranslations("reading");
  const tn = useTranslations("nav");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  /*
   * 封面落定之後：拎起本書（2026-09）。
   *
   * 由呢一刻開始唔再係題名幕嗰本細書，而係閱讀嗰本 —— 同目次、同每一章
   * 一模一樣嘅書（`BookSpread`）：左頁命盤、右頁字。本書由細跨頁嗰個盒放大過去，
   * 之後「讀下去」淨係翻右頁，個框唔再郁。
   *
   * 之前題名幕嗰本係另一個樣：細（760 闊）、命盤喺右頁、序喺左頁；
   * 一入目次本書突然大咗、命盤跳咗去左邊、導覽由夜色變紙色 —— 讀落好割裂。
   */
  const [from, setFrom] = useState<Box | null>(null);
  const [desk, setDesk] = useState(false);
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), NAMING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  /*
   * 頁頂導覽都要收（重新設計第四期）：全站有導覽，但呢一幕「冇任何掣」。
   * 離開呢版（unmount）一定要放返，唔係成個站冇咗導覽。
   *
   * ⚠ 等本書拎起先放返，唔係一撳就放（2026-09）：導覽同卷首一出現，成版會向下推 ——
   * 封面揭緊嗰陣本書跟住跳一截。而家佢哋同本書放大一齊淡入（`.jian-xian`）。
   */
  useEffect(() => {
    setQuiet(!desk);
    return () => setQuiet(false);
  }, [desk]);

  if (desk) {
    return (
      <>
        <div className="jian-xian">
          <Juanshou back="shelf" step={2} />
        </div>
        <BookSpread
          chart={chart}
          palace={LIFE_PALACE}
          from={from}
          /*
           * 展卷之後撳右邊（或者 →）翻到目次 —— 同「讀下去」同一個去處。
           * 左邊冇：呢個係本書第一個攤開，前面冇頁。
           * 冇 bookId（寫唔入 DB）就冇地方翻去，唔好扮有。
           */
          next={bookId ? { href: `/book/${bookId}`, label: tr("turnTo", { title: tn("contents") }) } : null}
          /* 同目次左頁頂一樣：翻去目次嗰陣左頁一個字都唔郁 */
          top={<p className="font-serif text-h2 font-semibold tracking-[0.16em]">{bookTitle(name)}</p>}
        >
          {/*
           * ⚠ 呢兩行唔喺呢度寫：佢哋係**真嗰章嘅頭兩樣嘢**（章名同章首），由 server 帶過嚟。
           * 攞唔到就唔出 —— 一版白紙好過一版寫住別人嘅序。
           */}
          {preface ? (
            <div>
              <h1 className="text-h1 font-semibold tracking-[0.16em]">{preface.title}</h1>
              <div className="wen mt-10 flex flex-col gap-6">
                <p>{preface.lead}</p>
              </div>
            </div>
          ) : null}
          {/*
           * ⚠ 呢一行係六幕同命書之間嗰道門。`bookId` 係 null 嗰陣唔出 ——
           * 唔係出一條死連結，亦都唔係出一句「已收入書齋」。冇寫到就係冇寫到。
           */}
          {bookId ? (
            <p className="mt-12">
              <PageTurnLink
                href={`/book/${bookId}`}
                className="font-sans text-cap tracking-[0.16em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
              >
                {t("readOn")} →
              </PageTurnLink>
            </p>
          ) : null}
        </BookSpread>
      </>
    );
  }

  /*
   * ⚠ 成幕行緊嗰陣，連頁頂嗰條返回同夜讀開關都收起。
   *
   * AC 寫「呢一幕**冇任何掣**」。第一版淨係做到本書嗰忽冇掣 ——
   * 但個返回連結同夜讀掣就企喺個名上面兩吋。
   * 一幕情感高點，上面掛住兩件工具，就唔再係一幕。
   *
   * 揭開之後先返嚟：嗰陣已經係喺度讀緊，唔再係嗰一下。
   */
  const scene = (
    <div
      ref={shell}
      className="mu-ti mu-wei"
      data-ready={ready ? "1" : "0"}
      data-open={open ? "1" : "0"}
    >
      <BookFlip
        open={open}
        onOpened={() => {
          /* 量低細書嗰個盒（放大由呢度起），然後換做閱讀嗰本 */
          const r = shell.current?.querySelector(".fan")?.getBoundingClientRect();
          setFrom(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null);
          setDesk(true);
        }}
        label={t("book", { name })}
        cover={
          <div className="flex h-full flex-col justify-between p-7 ps-10">
            <span className="flex items-center gap-3 font-latin text-cap uppercase tracking-[0.42em] text-ink-3">
              <BrandMark size={28} />
              {LATIN}
            </span>
            <div>
              {/*
               * 墨滲寫名：1600ms。同入齋「觀微」兩個字一樣嘅時間。
               *
               * ⚠ 時間由 `lib/timing.ts` 出，唔係由 `--dur-4` 出 ——
               * 嗰個 token 係畀成站用嘅，而呢一幕嘅時序係一份規格：
               * 改咗 `--dur-4` 唔應該連呢一幕嘅節奏都跟住變。
               */}
              <p
                className="moshen text-h2 font-semibold tracking-[0.18em]"
                style={{ animationDuration: `${INK_MS}ms` }}
              >
                {name}
              </p>
              <p className="mt-2 text-sm tracking-[0.1em] text-ink-2">{t("suffix")}</p>
              {/* 停 1.2 秒 —— 然後落印。 */}
              <Seal
                text={MARK}
                label={t("seal")}
                className="yin-luo mt-6"
                style={{ animationDelay: `${SEAL_DELAY_MS}ms` }}
              />
            </div>
          </div>
        }
        /*
         * 揭開嗰一下兩頁係白紙：封面一落定，本書就拎起、換做閱讀嗰本，
         * 字同盤喺嗰本入面先出（`BookSpread` `from`）。喺細書度寫咗又收，係白做一次。
         */
        verso={null}
        recto={null}
        overlay={
          /* 本書自己就係嗰個撳得嘅嘢。成幕未行完之前，佢根本唔喺度。 */
          ready && !open ? (
            <button
              type="button"
              className="mu-ti-kai"
              aria-label={t("openAria", { name })}
              onClick={() => setOpen(true)}
            />
          ) : null
        }
      />

      {/*
       * ⚠ 呢一行唔係一粒掣。
       *
       * 佢係一句細字，講畀你聽而家撳得。真正撳嘅係本書 ——
       * 所以佢冇邊框、冇底色、唔會 hover 變樣。
       * 而且成幕未行完之前，佢根本唔喺度。
       *
       * ⚠ 唔喺度 = 睇唔到，唔係唔 render（2026-09）：佢一出一收，`.mu-wei` 置中嘅
       * 內容高度就變，本書會跟住上下跳 —— 揭緊封面嗰陣跳 31px。所以一直佔住個位。
       */}
      <p
        className="mt-10 font-sans text-cap tracking-[0.16em] text-ink-3"
        style={{ visibility: ready && !open ? "visible" : "hidden" }}
        aria-hidden={ready && !open ? undefined : true}
      >
        {t("open")}
      </p>
    </div>
  );

  return scene;
}
