"use client";

import { useEffect, useRef, useState } from "react";
import { Naming } from "@/components/Naming";
import { FlowChrome } from "@/components/FlowChrome";
import { slotName, slotSummary, type Slot } from "@/lib/slots";
import { BookFlip } from "@/components/BookFlip";
import { castChart, type CastOutcome } from "@/app/[locale]/cast/actions";
import {
  EMPTY_DRAFT,
  PLACES,
  STEPS,
  TIME_HINT,
  answeredBefore,
  isAnswered,
  stepFromQuery,
  summaryOf,
  toCastRequest,
  type Draft,
  type Step,
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

const LABEL: Record<Step, string> = {
  name: "姓　名",
  date: "出生日期",
  time: "時　辰",
  place: "出生地",
  sex: "性　別",
};

const ASK: Record<Step, string> = {
  name: "這本書要寫上誰的名字？",
  date: "國曆的出生年月日。農曆由我們自己轉。",
  time: "出生的時間。",
  place: "在哪裡出生？",
  sex: "大限的順逆由陰陽男女決定，所以這一項排盤要用。",
};

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
const MULU = [
  "序 · 你的命盤",
  "一 · 命宮",
  "身宮與五行局",
  "⋯ 以下逐宮而讀，共十一章",
];

export function Luokuan() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [step, setStep] = useState<Step>("name");
  const [outcome, setOutcome] = useState<CastOutcome | null>(null);
  const [casting, setCasting] = useState(false);
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
  const ready = isAnswered(step, draft);
  const last = step === STEPS[STEPS.length - 1];

  async function next() {
    if (!ready) return;
    if (!last) {
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
        name: draft.name.trim(),
        token: token.current,
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
        name={draft.name.trim()}
        chart={outcome.chart}
        bookId={outcome.bookId}
        preface={outcome.preface}
      />
    ) : (
      <FlowChrome>
        <DaiShiChen name={draft.name.trim()} />
      </FlowChrome>
    );
  }

  return (
    <FlowChrome>
      {/* ⚠ 同題名幕共用一個版位 —— 書脊唔可以由跨頁跳去合埋（見 globals.css）。 */}
      <div className="mu-wei">
        {/* 攤開嘅書（揭書元件，冇動畫）：書脊喺正中，題名幕合埋嗰陣右頁唔郁 */}
        <BookFlip
          open
          label="落款"
          cover={null}
          verso={
            <div className="h-full">
              <p className="font-sans text-cap tracking-[0.2em] text-ink-3">
                目　次
              </p>
              <ul className="mt-5 flex flex-col gap-3">
                {MULU.map((m) => (
                  <li
                    key={m}
                    className="border-b jielan pb-2 text-sm tracking-[0.06em] text-ink-2"
                  >
                    {m}
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-sans text-cap leading-[1.9] tracking-[0.1em] text-ink-3">
                這幾章在寫生辰之前就已經定好。
                <br />
                寫完，它們才會有內容。
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
                      {LABEL[s]}
                    </span>
                    <span className="ms-3">{summaryOf(s, draft)}</span>
                  </p>
                ))}
              </div>

              <div className="mt-6 flex-1">
                <p className="font-sans text-cap tracking-[0.16em] text-ink-3">
                  {LABEL[step]}
                </p>
                <p className="mt-2 text-sm leading-[1.9] text-ink-2">
                  {ASK[step]}
                </p>
                <Field step={step} draft={draft} setDraft={setDraft} />
              </div>

              {outcome && !outcome.ok ? (
                <p className="mb-4 text-sm leading-[1.9] text-cinnabar">
                  {outcome.message}
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
                {casting ? "排　盤　中" : last ? "成　書" : "下　一　步"}
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
  return (
    <div className="max-w-banxin">
      <p className="font-sans text-cap tracking-[0.2em] text-ink-3">
        待　時　辰
      </p>
      <p className="mt-6 text-h2 font-semibold tracking-[0.18em]">{name}</p>
      <p className="mt-6 text-body leading-[1.95] text-ink-2">
        年月日已經排好，命宮還要等時辰。這本書會留在書架上，書脊是虛線的。
        補回時辰，書就成了。
      </p>
    </div>
  );
}

function Field({
  step,
  draft,
  setDraft,
}: {
  step: Step;
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  switch (step) {
    case "name":
      return (
        <input
          className="ruled mt-6"
          value={draft.name}
          maxLength={40}
          autoComplete="off"
          aria-label="姓名"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      );

    case "date":
      return (
        <input
          className="ruled mt-6"
          type="date"
          value={draft.date}
          min="1900-01-01"
          max="2100-12-31"
          aria-label="出生日期"
          onChange={(e) => setDraft({ ...draft, date: e.target.value, ...clearSlot(draft) })}
        />
      );

    case "time":
      return <TimeField draft={draft} setDraft={setDraft} />;

    case "place":
      return (
        <select
          className="ruled mt-6"
          value={draft.placeIndex ?? ""}
          aria-label="出生地"
          onChange={(e) =>
            setDraft({
              ...draft,
              placeIndex: e.target.value === "" ? null : Number(e.target.value),
              ...clearSlot(draft),
            })
          }
        >
          <option value="">請揀一個</option>
          {PLACES.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      );

    case "sex":
      return (
        <div className="mt-6 flex gap-3">
          {(["male", "female"] as const).map((sex) => (
            <button
              key={sex}
              type="button"
              className="btn-jie"
              aria-pressed={draft.sex === sex}
              style={
                draft.sex === sex
                  ? { borderColor: "var(--cinnabar)", color: "var(--cinnabar)" }
                  : undefined
              }
              onClick={() => setDraft({ ...draft, sex })}
            >
              {sex === "male" ? "男" : "女"}
            </button>
          ))}
        </div>
      );
  }
}

/**
 * 日期或者出生地一改，揀咗嘅時辰就唔再啱：同一個時辰喺另一日、另一個地方
 * 對應唔同嘅鐘面時間。填準確時間就唔使清 —— 鐘面時間本身冇變。
 */
function clearSlot(draft: Draft): Partial<Draft> {
  return draft.slot ? { slot: null, time: "" } : {};
}

/**
 * 時辰（落款第四步）：揀一個時辰，或者填準確時間，或者唔知。
 *
 * 每格啱啱好係一個時辰，旁邊寫明喺呢個出生地、呢一日，鐘面係幾點到幾點
 * （server 用引擎逐分鐘計，見 `lib/slots.ts`、`lib/slots.server.ts`、`/api/slots`）。
 * 揀咗就用嗰段嘅中間一分鐘排盤 —— 同一格入面任何一分鐘，排出嚟都係同一個盤。
 *
 * 計唔到（server 壞咗）就唔出格，準確時間照填得。
 */
function TimeField({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const [slots, setSlots] = useState<Slot[] | null | "loading">("loading");
  /* 填準確時間：已經填咗（冇揀時辰）就一入嚟打開 */
  const [exact, setExact] = useState(() => Boolean(draft.time) && !draft.slot);

  useEffect(() => {
    let live = true;
    setSlots("loading");
    /* POST：出生日期唔入網址 */
    fetch("/api/slots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: draft.date, placeIndex: draft.placeIndex }),
    })
      .then((r) => (r.ok ? r.json() : { slots: null }))
      .then(
        (j: { slots: Slot[] | null }) => live && setSlots(j.slots),
        () => live && setSlots(null),
      );
    return () => {
      live = false;
    };
  }, [draft.date, draft.placeIndex]);

  return (
    <>
      {draft.noHour ? (
        /*
         * 「唔知時辰」嘅安撫文案（工單 AC）。
         * 架構 §8：冇時辰定唔到命宮 = 冇書，**但唔好扮有**。
         * 呢個時候時辰選項收埋 —— 揀唔到嘅嘢唔好擺喺度。
         */
        <p className="mt-5 text-sm leading-[1.9] text-ink-2">
          沒有時辰就定不到命宮，所以這本書會先留在書架上，書脊是虛線的 ——
          此書待時辰而成。出世紙上通常有；問家人也常常問得回來。
          補回時辰，書就成了。
        </p>
      ) : exact ? (
        /* 記得準確時間：直接填。揀咗時辰嗰陣呢格係空嘅 —— 兩樣唔會同時生效。 */
        <div className="mt-5 flex flex-col gap-2">
          <input
            className="ruled"
            type="time"
            value={draft.slot ? "" : draft.time}
            aria-label="出生時間"
            onChange={(e) => setDraft({ ...draft, time: e.target.value, slot: null, noHour: false })}
          />
          <button
            type="button"
            className="self-start text-cap tracking-[0.12em] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            onClick={() => setExact(false)}
          >
            改為揀時辰
          </button>
        </div>
      ) : slots === "loading" ? (
        <p className="mt-5 text-cap tracking-[0.12em] text-ink-3">推算這一天的時辰⋯</p>
      ) : slots ? (
        /* 窄就兩欄、夠闊先三欄（跟頁闊，唔跟視窗闊 —— 本書喺手機同桌面闊度唔同） */
        <div className="@container mt-3">
          <div role="group" aria-label="揀一個時辰" className="grid grid-cols-2 gap-1 @[300px]:grid-cols-3">
            {slots.map((slot) => {
              const summary = slotSummary(slot);
              const on = draft.slot === summary;
              return (
                <button
                  key={`${slot.dayIndex}-${slot.shichen}`}
                  type="button"
                  aria-pressed={on}
                  aria-label={summary}
                  onClick={() => setDraft({ ...draft, time: slot.pick, slot: summary, noHour: false })}
                  className={`flex flex-col items-start rounded-[var(--r)] border px-2 py-0.5 text-start leading-tight transition-colors duration-200 ${
                    on ? "border-gold bg-gold-wash text-ink" : "border-rule text-ink-2 hover:border-ink-3"
                  }`}
                >
                  <span className="font-serif text-sm">{slotName(slot)}</span>
                  <span className="whitespace-nowrap font-sans text-[0.6875rem] tracking-[0.02em] text-ink-3" data-nums>
                    {slot.from}–{slot.to}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* 計唔到（server 壞咗）：唔出格，直接填準確時間 */
        <input
          className="ruled mt-5"
          type="time"
          value={draft.time}
          aria-label="出生時間"
          onChange={(e) => setDraft({ ...draft, time: e.target.value, slot: null, noHour: false })}
        />
      )}

      {/* R-007：呢句要出現喺畫面上，唔係出現喺一份說明文件度。 */}
      <p className="mt-2 font-sans text-cap leading-[1.7] tracking-[0.06em] text-ink-3">{TIME_HINT}</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {!exact && !draft.noHour && slots !== null ? (
          <button
            type="button"
            className="text-cap tracking-[0.12em] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            onClick={() => setExact(true)}
          >
            記得準確時間？
          </button>
        ) : (
          <span />
        )}
        <label className="flex items-center gap-3 text-sm">
          <input
            className="gou"
            type="checkbox"
            checked={draft.noHour}
            onChange={(e) => setDraft({ ...draft, noHour: e.target.checked })}
          />
          <span>不知道時辰</span>
        </label>
      </div>
    </>
  );
}
