"use client";

import { useEffect, useState } from "react";
import { Book } from "@/components/Book";
import { Link } from "@/i18n/navigation";
import { FlowChrome } from "@/components/FlowChrome";
import { Zhanjuan } from "@/components/Zhanjuan";
import { Seal } from "@/components/Seal";
import { Chart } from "@/components/Chart";
import { INK_MS, NAMING_MS, SEAL_DELAY_MS } from "@/lib/timing";
import { MARK } from "@/lib/site";
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
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

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
      className="mu-ti mu-wei"
      data-ready={ready ? "1" : "0"}
      data-open={open ? "1" : "0"}
    >
      <Book
        state={open ? "open" : "titled"}
        label={`${name}命書`}
        spine={`${name}命書`}
        cover={
          <div className="flex h-full flex-col justify-between p-7">
            <span className="font-latin text-cap uppercase tracking-[0.42em] text-ink-3">
              GUAN WEI
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
              <p className="mt-2 text-sm tracking-[0.1em] text-ink-2">命書</p>
              {/* 停 1.2 秒 —— 然後落印。 */}
              <Seal
                text={MARK}
                label="觀微印"
                className="yin-luo mt-6"
                style={{ animationDelay: `${SEAL_DELAY_MS}ms` }}
              />
            </div>
          </div>
        }
        verso={
          /*
           * ⚠ 呢兩行唔喺呢度寫。
           *
           * 佢哋係**真嗰章嘅頭兩樣嘢**（章名同章首），由 server 帶過嚟。
           * 之前呢度手寫咗兩句 stand-in，同 `free.ts` 嗰個序講唔同嘅嘢 ——
           * 讀者喺封面見到一句，揭開之後讀到另一句。
           *
           * 攞唔到就乜都唔出：一版白紙好過一版寫住別人嘅序。
           */
          preface ? (
            <div className="h-full p-7">
              <p className="font-sans text-cap tracking-[0.2em] text-ink-3">{preface.title}</p>
              <p className="mt-5 text-sm leading-[1.95] text-ink-2">{preface.lead}</p>
            </div>
          ) : null
        }
        recto={
          /*
           * ⚠ 揭開咗先起個盤。
           *
           * E2 個「書」元件兩層都留喺 DOM（要淡入淡出），而未開嗰層係
           * `inert` —— 撳唔到、讀屏讀唔到。但佢仲係十二個 `<button>`。
           *
           * 呢一幕嘅 AC 係「**冇任何掣**」，而一個要解釋「嗰十二個其實
           * 撳唔到」先算數嘅畫面，唔叫冇掣。所以索性未開就唔起。
           */
          open && chart ? (
            /*
             * 展卷（E6）：界欄逐條畫出成十二宮，星以點落位，
             * 然後先出真盤。呢一幕唔係 loading —— 盤喺題名嗰陣已經算好。
             */
            <div className="flex h-full items-center p-4">
              <div className="w-full" style={{ maxWidth: 400 }}>
                <Zhanjuan>
                  <ChartPane chart={chart} name={name} />
                </Zhanjuan>
              </div>
            </div>
          ) : null
        }
        overlay={
          /* 本書自己就係嗰個撳得嘅嘢。成幕未行完之前，佢根本唔喺度。 */
          ready && !open ? (
            <button
              type="button"
              className="mu-ti-kai"
              aria-label={`揭開${name}命書`}
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
       */}
      {ready && !open ? (
        <p className="mt-10 font-sans text-cap tracking-[0.16em] text-ink-3">
          揭開
        </p>
      ) : null}

      {/*
       * ⚠ 呢一行係六幕同命書之間嗰道門，而佢一直都冇（G5 之前）。
       *
       * 之前題名完就停喺張盤度：本書冇寫落 DB，所以連一個 id 都冇，
       * 連唔到去 `/book/[id]`。而家有咗。
       *
       * `bookId` 係 null 嗰陣呢一行唔出 —— 唔係出一條死連結，
       * 亦都唔係出一句「已收入書齋」。冇寫到就係冇寫到。
       */}
      {open && bookId ? (
        <p className="mt-10">
          <Link
            href={`/book/${bookId}`}
            className="font-sans text-cap tracking-[0.16em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
          >
            讀下去
          </Link>
        </p>
      ) : null}
    </div>
  );

  return open ? <FlowChrome>{scene}</FlowChrome> : scene;
}

function ChartPane({ chart, name }: { chart: ZChart; name: string }) {
  const [lit, setLit] = useState<number | null>(null);
  return (
    <Chart
      chart={chart}
      selected={lit}
      onSelect={setLit}
      maxWidth={400}
      center={
        <p className="text-center font-sans text-cap tracking-[0.16em] text-ink-3">
          {name}
        </p>
      }
    />
  );
}
