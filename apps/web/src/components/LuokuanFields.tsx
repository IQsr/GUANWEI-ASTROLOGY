"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { slotName, slotSummary, type Slot, type ShichenWords } from "@/lib/slots";
import { PLACES, type Draft, type Step } from "@/lib/luokuan";

/**
 * 落款嘅五個欄（2026-10-06 由 `Luokuan.tsx` 抽出嚟）。
 *
 * 一步一步嘅書（舊）同一版過嘅庚帖（`Gengtie`）共用同一套欄 ——
 * 驗證、時辰推算、「唔知時辰」嘅分支都喺呢度，唔會兩邊各寫一套。
 */
/** 時辰嘅字（messages `shichen.*`） */
export function useShichenWords(): ShichenWords {
  const t = useTranslations("shichen");
  return {
    branch: t.raw("branch") as string[],
    hour: (branch) => t("hour", { branch }),
    earlyZi: t("earlyZi"),
    lateZi: t("lateZi"),
    prevZi: t("prevZi"),
  };
}

export function Field({
  step,
  draft,
  setDraft,
}: {
  step: Step;
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const t = useTranslations("cast");
  const tp = useTranslations("places");
  switch (step) {
    case "name":
      return (
        <input
          className="ruled mt-6"
          value={draft.name}
          maxLength={40}
          autoComplete="off"
          aria-label={t("aria.name")}
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
          aria-label={t("aria.date")}
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
          aria-label={t("aria.place")}
          onChange={(e) =>
            setDraft({
              ...draft,
              placeIndex: e.target.value === "" ? null : Number(e.target.value),
              ...clearSlot(draft),
            })
          }
        >
          <option value="">{t("choose")}</option>
          {PLACES.map((p, i) => (
            <option key={p.key} value={i}>
              {tp(p.key)}
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
              {sex === "male" ? t("male") : t("female")}
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
export function clearSlot(draft: Draft): Partial<Draft> {
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
export function TimeField({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const t = useTranslations("cast");
  const shichen = useShichenWords();
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
          {t("noHourComfort")}
        </p>
      ) : exact ? (
        /* 記得準確時間：直接填。揀咗時辰嗰陣呢格係空嘅 —— 兩樣唔會同時生效。 */
        <div className="mt-5 flex flex-col gap-2">
          <input
            className="ruled"
            type="time"
            value={draft.slot ? "" : draft.time}
            aria-label={t("aria.time")}
            onChange={(e) => setDraft({ ...draft, time: e.target.value, slot: null, noHour: false })}
          />
          <button
            type="button"
            className="self-start text-cap tracking-[0.12em] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            onClick={() => setExact(false)}
          >
            {t("backToSlots")}
          </button>
        </div>
      ) : slots === "loading" ? (
        <p className="mt-5 text-cap tracking-[0.12em] text-ink-3">{t("slotsLoading")}</p>
      ) : slots ? (
        /* 窄就兩欄、夠闊先三欄（跟頁闊，唔跟視窗闊 —— 本書喺手機同桌面闊度唔同） */
        <div className="@container mt-3">
          <div role="group" aria-label={t("aria.slots")} className="grid grid-cols-2 gap-1 @[300px]:grid-cols-3">
            {slots.map((slot) => {
              const summary = slotSummary(slot, shichen);
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
                  <span className="font-serif text-sm">{slotName(slot, shichen)}</span>
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
          aria-label={t("aria.time")}
          onChange={(e) => setDraft({ ...draft, time: e.target.value, slot: null, noHour: false })}
        />
      )}

      {/* R-007：呢句要出現喺畫面上，唔係出現喺一份說明文件度。 */}
      <p className="mt-2 font-sans text-cap leading-[1.7] tracking-[0.06em] text-ink-3">{t("timeHint")}</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {!exact && !draft.noHour && slots !== null ? (
          <button
            type="button"
            className="text-cap tracking-[0.12em] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            onClick={() => setExact(true)}
          >
            {t("exactToggle")}
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
          <span>{t("noHour")}</span>
        </label>
      </div>
    </>
  );
}
