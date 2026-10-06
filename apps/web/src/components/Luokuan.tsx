"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Naming } from "@/components/Naming";
import { FlowChrome } from "@/components/FlowChrome";
import { Field } from "@/components/LuokuanFields";
import { BookFlip } from "@/components/BookFlip";
import { nameOf } from "@/lib/chengshu";
import { castChart, type CastOutcome } from "@/app/[locale]/cast/actions";
import { ConsentGate } from "@/components/ConsentGate";
import { LEGAL_VERSION } from "@/lib/legal";
import {
  EMPTY_DRAFT,
  STEPS,
  answeredBefore,
  canLeave,
  chineseDate,
  stepFromQuery,
  summaryOf,
  toCastRequest,
  type Draft,
  type Step,
  type SummaryWords,
} from "@/lib/luokuan";

/**
 * 開卷落款（工單 E4 · 架構 §3 · 視覺系統 §9）
 *
 * ── 落款而家真係「寫落書度」──
 *
 * 五步唔係一個表格，係**寫喺一本打開咗嘅書嘅右頁**。
 * 左頁係目錄 —— 你未寫生辰，但本書已經知道佢入面會有乜。
 *
 * ⚠ 三條唔可以破嘅規矩：
 *
 * 一、**已答嘅留喺上面，淡到 20%**（視覺 §9）。唔係收埋，
 *     亦都唔係變返一個可以撳嘅欄 —— 佢係你已經寫咗落去嘅墨。
 * 二、**打字期間唔准重畫粒掣**（原型撞過）。
 *     粒掣永遠係同一個 DOM 節點，只會轉 `disabled` ——
 *     條件 render 會令 mousedown 同 mouseup 落喺兩個唔同節點度，
 *     用戶撳落空，而佢唔會知發生咗乜事，只會覺得個網壞咗。
 * 三、**冇確認頁**。五步完直入排盤。
 */

/**
 * 未寫生辰，但本書已經知道入面會有乜。
 *
 * ⚠ 呢張目次要同真書對得返（C12）。
 *
 * 第一版照抄架構 §6 個免費五章名單 —— 但入面三章（身宮與五行局、
 * 三方四正、性格的骨架）**生成唔到**。即係話落款嗰陣本書答應咗五章，
 * 成書之後得兩章有字。
 *
 * 一張寫住未來計劃嘅目次，就係扮有（架構 §8）。
 * 所以而家列真嘢：序、命宮，然後其餘逐宮章。
 */
/* 目次嗰幾行喺 messages：`cast.mulu`（同真書對得返，見上面）。 */

/** 已答嗰行嘅字。中文日期用中文數字；其他語言用當地格式。 */
function useSummaryWords(): SummaryWords {
  const t = useTranslations("cast");
  const tp = useTranslations("places");
  const locale = useLocale();
  return {
    noHour: t("noHourSummary"),
    male: t("male"),
    female: t("female"),
    place: (key) => tp(key),
    date: (iso) =>
      locale.startsWith("zh")
        ? (chineseDate(iso) ?? iso)
        : new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          }),
  };
}


export function Luokuan() {
  const t = useTranslations("cast");
  const words = useSummaryWords();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [step, setStep] = useState<Step>("name");
  const [outcome, setOutcome] = useState<CastOutcome | null>(null);
  const [casting, setCasting] = useState(false);
  /* 同意咗條款及私隱政策先准排盤（ConsentGate）；server 同 DB 會再查一次 */
  const [consented, setConsented] = useState(false);
  const started = useRef(false);

  /*
   * ⚠ 一個 mount 一個 token —— 重試用返同一個（G5）。
   *
   * 網絡斷一下、粒掣返生、佢再撳一次：第一次可能已經寫成功咗，
   * 只係個回覆冇返到嚟。同一個 token 之下，第二次攞返嘅係
   * **同一本書**，唔係兩本一模一樣嘅書坐喺書架上面。
   *
   * 唔喺 render 嗰陣生 —— 呢個值唔會出現喺畫面度，
   * 但 lazy 生成順手省返 server render 嗰次冇用嘅 uuid。
   */
  const token = useRef<string | null>(null);

  /*
   * 一入嚟先睇 `?step=` —— 但**一步都唔可以跳**（架構 §3）。
   * 直接開 `?step=sex` 會落返第一個未答嘅步。
   */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = new URLSearchParams(window.location.search).get("step");
    setStep(stepFromQuery(query, EMPTY_DRAFT));
  }, []);

  /* `?step=` 只係為咗 back 掣行為，唔係一個可以入嘅網址（架構 §3）。 */
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", step);
    window.history.replaceState(null, "", url);
  }, [step]);

  const answered = answeredBefore(step, draft);
  const ready = canLeave(step, draft);
  const last = step === STEPS[STEPS.length - 1];

  async function next() {
    if (!ready) return;
    if (!last) {
      /* 姓名留空撳落一步 = 答咗「無名」 */
      if (step === "name") setDraft({ ...draft, nameless: draft.name.trim() === "" });
      setStep(STEPS[STEPS.indexOf(step) + 1]!);
      return;
    }
    /* 五步完，直入排盤 —— 冇確認頁。 */
    const request = toCastRequest(draft);
    if (!request) return;
    token.current ??= crypto.randomUUID();
    setCasting(true);
    setOutcome(
      await castChart({
        ...request,
        name: nameOf(draft.name),
        token: token.current,
        terms: consented ? LEGAL_VERSION : "",
      }),
    );
    setCasting(false);
  }

  /*
   * ⚠ 排盤失敗就停喺落款最後一步（架構 §8）。
   * 唔入題名動畫、唔出半本書 —— 一本排唔到盤嘅書，唔應該有封面。
   */
  /*
   * ⚠ 排盤成功先入題名動畫；失敗停喺落款最後一步（架構 §8 · E5 AC 一）。
   *
   * 「停喺最後一步」唔係「出個錯誤頁」—— 佢要留返喺原本嗰版，
   * 所有答案都仲喺度，改一個字就可以再試。一個排唔到盤嘅人，
   * 十居其九係打錯咗一個數字。
   */
  if (outcome?.ok === true) {
    return outcome.kind === "full" ? (
      <Naming
        name={nameOf(draft.name)}
        chart={outcome.chart}
        bookId={outcome.bookId}
        preface={outcome.preface}
      />
    ) : (
      <FlowChrome>
        <DaiShiChen name={nameOf(draft.name)} />
      </FlowChrome>
    );
  }

  return (
    <FlowChrome>
      <ConsentGate onConsent={() => setConsented(true)} />
      {/* ⚠ 同題名幕共用一個版位 —— 書脊唔可以由跨頁跳去合埋（見 globals.css）。 */}
      <div className="mu-wei">
        {/* 攤開嘅書（揭書元件，冇動畫）：書脊喺正中，題名幕合埋嗰陣右頁唔郁 */}
        <BookFlip
          open
          label={t("bookLabel")}
          cover={null}
          verso={
            <div className="h-full">
              <p className="font-sans text-cap tracking-[0.2em] text-ink-3">
                {t("contents")}
              </p>
              <ul className="mt-5 flex flex-col gap-3">
                {(t.raw("mulu") as string[]).map((m) => (
                  <li
                    key={m}
                    className="border-b jielan pb-2 text-sm tracking-[0.06em] text-ink-2"
                  >
                    {m}
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-sans text-cap leading-[1.9] tracking-[0.1em] text-ink-3">
                {t("muluNote1")}
                <br />
                {t("muluNote2")}
              </p>
            </div>
          }
          recto={
            <div className="flex h-full flex-col">
              {/* 已答嘅留喺上面，淡到 20% */}
              {/* 排埋一齊自動換行：時辰嗰步要慳位（十三格時辰選項） */}
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {answered.map((s) => (
                  <p key={s} className="da text-sm leading-[1.9]">
                    <span className="font-sans text-cap tracking-[0.16em]">
                      {t(`label.${s}`)}
                    </span>
                    <span className="ms-3">{summaryOf(s, draft, words)}</span>
                  </p>
                ))}
              </div>

              <div className="mt-6 flex-1">
                <p className="font-sans text-cap tracking-[0.16em] text-ink-3">
                  {t(`label.${step}`)}
                </p>
                <p className="mt-2 text-sm leading-[1.9] text-ink-2">
                  {t(`ask.${step}`)}
                </p>
                <Field step={step} draft={draft} setDraft={setDraft} />
              </div>

              {outcome && !outcome.ok ? (
                <p className="mb-4 text-sm leading-[1.9] text-cinnabar">
                  {t.has(`errors.${outcome.code}`) ? t(`errors.${outcome.code}`) : t("errors.NOT_IMPLEMENTED")}
                </p>
              ) : null}

              {/*
               * ⚠ 呢粒掣**永遠都喺度**，只會轉 disabled 同字。
               * 條件 render（`{ready ? <button/> : null}`）會令打字期間
               * 個節點換咗，用戶撳落空。
               */}
              <button
                type="button"
                className="btn-mo self-start"
                disabled={!ready || casting}
                onClick={next}
              >
                {casting ? t("casting") : last ? t("finish") : t("next")}
              </button>
            </div>
          }
        />
      </div>
    </FlowChrome>
  );
}

/**
 * 唔知時辰（架構 §8）。
 *
 * ⚠ 呢個**唔係題名幕**：冇墨滲、冇朱砂印、揭唔開。
 * 冇時辰定唔到命宮 = 冇書，而「唔好扮有」嘅意思就係
 * 唔可以畀佢行一次同成書一模一樣嘅儀式。
 */
function DaiShiChen({ name }: { name: string }) {
  const t = useTranslations("cast");
  return (
    <div className="max-w-banxin">
      <p className="font-sans text-cap tracking-[0.2em] text-ink-3">
        {t("awaitTitle")}
      </p>
      <p className="mt-6 text-h2 font-semibold tracking-[0.18em]">{name}</p>
      <p className="mt-6 text-body leading-[1.95] text-ink-2">
        {t("awaitBody1")}
        <br />
        {t("awaitBody2")}
      </p>
    </div>
  );
}
