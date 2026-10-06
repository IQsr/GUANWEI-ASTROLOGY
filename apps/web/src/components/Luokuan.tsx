"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Naming } from "@/components/Naming";
import { FlowChrome } from "@/components/FlowChrome";
import { Juanzhou } from "@/components/Juanzhou";
import { nameOf } from "@/lib/chengshu";
import { castChart, type CastOutcome } from "@/app/[locale]/cast/actions";
import { ConsentGate } from "@/components/ConsentGate";
import { LEGAL_VERSION } from "@/lib/legal";
import { EMPTY_DRAFT, toCastRequest, type Draft } from "@/lib/luokuan";

/**
 * 開卷落款（工單 E4 · 架構 §3 · 視覺系統 §9）
 *
 * ── 2026-10-06：落款改做一幅卷軸（`Juanzhou`）──
 *
 * 以前係五步，一步一步寫落一本打開咗嘅書嘅右頁。Issac：「你會令到人哋唔知道
 * 個 input 嘅資料需要幾多。」所以而家五樣嘢一版過寫喺一幅立軸上：
 * 姓名、生辰、生地、時辰、性別。寫齊咗，落印。
 *
 * ⚠ 仲守住嘅規矩：
 *
 * 一、**印（掣）唔准重畫**（原型撞過）。佢永遠係同一個 DOM 節點，只會轉 `disabled` ——
 *     條件 render 會令 mousedown 同 mouseup 落喺兩個唔同節點度，用戶撳落空。
 * 二、**冇確認頁**。落印就係確認：印一落就去排盤，同時卷軸捲埋。
 * 三、**生辰唔入網址**（架構 §3）。以前得 `?step=` 一個 query；而家冇步，一個都唔寫。
 *     舊連結帶住 `?step=…` 入嚟，照樣落返成幅卷軸，順手清走個 query。
 *
 * 排盤失敗：卷軸重新展開，所有答案仲喺度，錯誤寫喺印旁邊 —— 一個排唔到盤嘅人，
 * 十居其九係打錯咗一個數字（架構 §8）。
 */
export function Luokuan() {
  const t = useTranslations("cast");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [outcome, setOutcome] = useState<CastOutcome | null>(null);
  const [casting, setCasting] = useState(false);
  /* 印落咗（卷軸捲緊／捲埋咗）；捲完先入題名幕 */
  const [sealed, setSealed] = useState(false);
  const [folded, setFolded] = useState(false);
  /* 同意咗條款及私隱政策先准排盤（ConsentGate）；server 同 DB 會再查一次 */
  const [consented, setConsented] = useState(false);

  /*
   * ⚠ 一個 mount 一個 token —— 重試用返同一個（G5）。
   *
   * 網絡斷一下、佢再落一次印：第一次可能已經寫成功咗，只係個回覆冇返到嚟。
   * 同一個 token 之下，第二次攞返嘅係**同一本書**，唔係兩本一模一樣嘅書坐喺書架上面。
   */
  const token = useRef<string | null>(null);

  /* 舊連結嘅 `?step=…`：冇步喇，清走（唔係一個可以入嘅網址） */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("step")) return;
    url.searchParams.delete("step");
    window.history.replaceState(null, "", url);
  }, []);

  async function seal() {
    /* 姓名留空 = 書上寫「無名」 */
    const filled = { ...draft, nameless: draft.name.trim() === "" };
    const request = toCastRequest(filled);
    if (!request) return;
    token.current ??= crypto.randomUUID();
    setDraft(filled);
    setOutcome(null);
    setSealed(true);
    setFolded(false);
    setCasting(true);
    const result = await castChart({
      ...request,
      name: nameOf(filled.name),
      token: token.current,
      terms: consented ? LEGAL_VERSION : "",
    });
    setCasting(false);
    setOutcome(result);
    /* 排唔到：卷軸重新展開，答案留低，錯誤寫喺印旁邊 */
    if (!result.ok) setSealed(false);
  }

  /*
   * ⚠ 排盤成功、而且卷軸捲埋咗，先入題名動畫（架構 §8 · E5 AC 一）。
   * 一本排唔到盤嘅書，唔應該有封面。
   */
  if (outcome?.ok === true && folded) {
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

  const error =
    outcome && !outcome.ok
      ? t.has(`errors.${outcome.code}`)
        ? t(`errors.${outcome.code}`)
        : t("errors.NOT_IMPLEMENTED")
      : null;

  return (
    <FlowChrome>
      <ConsentGate onConsent={() => setConsented(true)} />
      <div className="mu-wei">
        <Juanzhou
          draft={draft}
          setDraft={setDraft}
          onSeal={seal}
          sealed={sealed}
          busy={casting}
          error={error}
          onFolded={() => setFolded(true)}
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
