"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Seal } from "@/components/Seal";
import { MARK } from "@/lib/site";
import { slotName, slotSummary, type ShichenWords, type Slot } from "@/lib/slots";
import { PLACES, isAnswered, type Draft, type Step } from "@/lib/luokuan";

/**
 * 落款卷軸（2026-10-06 · Issac：落款唔好再一步一步寫落本書）
 *
 * 一步一步嘅書，填嘅人唔知仲有幾多要填；所以五樣嘢一版過寫喺一幅立軸上。
 * （試過紅帖「庚帖」，Issac 覺得怪 —— 換做卷軸，字畫上寫名落印本來就叫落款。）
 *
 * 寫法似喺紙上寫字，唔似填表：
 *   · 一行一樣，字寫喺線上；冇框、冇表格直線
 *   · 生辰寫成「＿＿年＿月＿日」，唔用瀏覽器個日期欄（英文瀏覽器會出 mm/dd/yyyy）
 *   · 時辰係一個選單：十二個時辰（按出生地同日子推算嘅鐘面時間）、記得準確時間、不知道時辰
 *   · 男女揀咗就用朱砂圈住
 *   · 落印係一枚印：未寫齊就係虛線框，旁邊講仲欠乜；寫齊咗先轉紅
 *
 * ⚠ 時辰一定喺生地之後：時辰嘅鐘面時間要按出生地經度校正（R-007），
 *   生辰同生地未寫好，時辰選單唔開。
 * ⚠ 印（掣）永遠喺度，只會轉 disabled（原型撞過：條件 render 會令人撳落空）。
 * ⚠ 冇確認頁：落印就係確認。印一落，停一停，卷軸由下向上捲埋，捲完叫 `onFolded`。
 */
export function Juanzhou({
  draft,
  setDraft,
  onSeal,
  sealed,
  busy,
  error,
  onFolded,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSeal: () => void;
  sealed: boolean;
  busy: boolean;
  error?: string | null;
  onFolded?: () => void;
}) {
  const t = useTranslations("juanzhou");
  const tp = useTranslations("places");
  /* 英文另外排：字距、標籤闊度、印字橫寫（globals.css `.juanzhou[data-lang="en"]`） */
  const locale = useLocale();
  /* 姓名留空都算寫咗（書上寫「無名」） */
  const missing = (["date", "place", "time", "sex"] as const).filter((s) => !isAnswered(s, draft));
  const ready = missing.length === 0;

  /* reduced-motion：冇捲軸動畫，animationend 唔會嚟 —— 落咗印就當捲完 */
  useEffect(() => {
    if (sealed && window.matchMedia("(prefers-reduced-motion: reduce)").matches) onFolded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFolded 係 callback，唔係觸發條件
  }, [sealed]);

  return (
    <section
      className="juanzhou"
      data-lang={locale === "en" ? "en" : undefined}
      aria-label={t("title")}
      data-sealed={sealed ? "" : undefined}
      onAnimationEnd={(e) => {
        /* 卷軸捲埋（zhou-shou）；唔支援 interpolate-size 嘅瀏覽器淡出（zhou-dan） */
        if (e.animationName === "zhou-shou" || e.animationName === "zhou-dan") onFolded?.();
      }}
    >
      <i className="zhou-gan zhou-tian" aria-hidden="true" />
      <div className="zhou-ling">
        <div className="zhou-zhi">
          <header className="zhou-tou">
            <h2 className="zhou-ti">{t("title")}</h2>
            <p className="zhou-ci">{t("lead")}</p>
          </header>

          <div className="zhou-hang">
            <span className="zhou-ming" id="zhou-name">{t("label.name")}</span>
            <input
              className="zhou-xian"
              value={draft.name}
              maxLength={40}
              autoComplete="off"
              placeholder={t("namePh")}
              aria-labelledby="zhou-name"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>

          <div className="zhou-hang">
            <span className="zhou-ming">{t("label.date")}</span>
            <DateLine draft={draft} setDraft={setDraft} />
          </div>

          <div className="zhou-hang">
            <span className="zhou-ming" id="zhou-place">{t("label.place")}</span>
            <select
              className="zhou-xian"
              value={draft.placeIndex ?? ""}
              aria-labelledby="zhou-place"
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
          </div>

          {/* 計時（2026-10-06，R-004）：出生地真太陽時（預設）或者中州派講義嘅洛陽時間 */}
          <div className="zhou-hang">
            <span className="zhou-ming" id="zhou-basis">{t("label.basis")}</span>
            <div>
              <div className="zhou-ji" role="group" aria-labelledby="zhou-basis">
                {(["birthplace", "luoyang"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={(draft.timeBasis ?? "birthplace") === b}
                    onClick={() => {
                      if ((draft.timeBasis ?? "birthplace") === b) return;
                      setDraft({ ...draft, timeBasis: b, ...clearSlot(draft) });
                    }}
                  >
                    {t(`basis.${b}`)}
                  </button>
                ))}
              </div>
              {draft.timeBasis === "luoyang" ? <p className="zhou-zhu">{t("basisNote")}</p> : null}
            </div>
          </div>

          <div className="zhou-hang">
            <span className="zhou-ming" id="zhou-time">{t("label.time")}</span>
            <TimeLine draft={draft} setDraft={setDraft} />
          </div>

          <div className="zhou-hang">
            <span className="zhou-ming" id="zhou-sex">{t("label.sex")}</span>
            <div className="zhou-quan" role="group" aria-labelledby="zhou-sex">
              {(["male", "female"] as const).map((sex) => (
                <button key={sex} type="button" aria-pressed={draft.sex === sex} onClick={() => setDraft({ ...draft, sex })}>
                  {t(sex)}
                </button>
              ))}
            </div>
          </div>

          <footer className="zhou-wei">
            <p className="zhou-qian" aria-live="polite">
              {error ? (
                <span className="zhou-cuo">{error}</span>
              ) : sealed ? null : ready ? (
                t("readyHint")
              ) : (
                t("missing", { list: missing.map((s: Step) => t(`label.${s}`)).join(t("sep")) })
              )}
            </p>
            {/* 印就係掣：未寫齊係虛線框，寫齊咗轉紅；落咗印，換做真嗰枚印壓落去 */}
            <button type="button" className="zhou-yin-an" disabled={!ready || busy || sealed} onClick={onSeal}>
              {busy ? t("sealing") : t("seal")}
            </button>
            {sealed ? <Seal text={MARK} label={t("sealed")} className="yin-luo zhou-yin" /> : null}
          </footer>
        </div>
      </div>
      <i className="zhou-gan zhou-di" aria-hidden="true" />
    </section>
  );
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * 生辰：＿＿＿＿年 ＿＿月 ＿＿日（國曆）。
 * 三格齊、日子真係存在先寫入 `draft.date`（yyyy-mm-dd）；未齊就係空 —— 落印嗰度會講仲欠生辰。
 * 日子一改，揀咗嘅時辰要清（同一個時辰喺另一日對應唔同鐘面時間）。
 */
function DateLine({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const t = useTranslations("juanzhou");
  /* 英文冇「年月日」字跟住：月份寫月名，唔係淨係一個 3，先分得出月同日。
     用縮寫（Mar、Sep）：全寫「September」喺手機逼斷成行（2026-10-09） */
  const locale = useLocale();
  const monthName = (i: number) =>
    locale === "en"
      ? new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(Date.UTC(2000, i, 1))
      : String(i + 1);
  const [y0, m0, d0] = draft.date ? draft.date.split("-") : ["", "", ""];
  const [y, setY] = useState(y0 ?? "");
  const [m, setM] = useState(m0 ? String(Number(m0)) : "");
  const [d, setD] = useState(d0 ? String(Number(d0)) : "");

  const commit = (ny: string, nm: string, nd: string) => {
    const yy = Number(ny);
    const ok =
      /^\d{4}$/.test(ny) && yy >= 1900 && yy <= 2100 && nm !== "" && nd !== "" && Number(nd) <= daysIn(yy, Number(nm));
    const iso = ok ? `${ny}-${nm.padStart(2, "0")}-${nd.padStart(2, "0")}` : "";
    if (iso !== draft.date) setDraft({ ...draft, date: iso, ...clearSlot(draft) });
  };

  const max = /^\d{4}$/.test(y) && m ? daysIn(Number(y), Number(m)) : 31;
  return (
    <div className="zhou-ri">
      <input
        className="zhou-xian zhou-nian"
        inputMode="numeric"
        maxLength={4}
        placeholder={t("yearPh")}
        aria-label={t("yearAria")}
        value={y}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          setY(v);
          commit(v, m, d);
        }}
      />
      {t("year") ? <span>{t("year")}</span> : null}
      <select
        className="zhou-xian zhou-yue"
        aria-label={t("monthAria")}
        value={m}
        onChange={(e) => {
          setM(e.target.value);
          commit(y, e.target.value, d);
        }}
      >
        <option value="">{t("monthPh")}</option>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={String(i + 1)}>
            {monthName(i)}
          </option>
        ))}
      </select>
      {t("month") ? <span>{t("month")}</span> : null}
      <select
        className="zhou-xian"
        aria-label={t("dayAria")}
        value={d}
        onChange={(e) => {
          setD(e.target.value);
          commit(y, m, e.target.value);
        }}
      >
        <option value="">{t("dayPh")}</option>
        {Array.from({ length: max }, (_, i) => (
          <option key={i} value={String(i + 1)}>
            {i + 1}
          </option>
        ))}
      </select>
      {t("day") ? <span>{t("day")}</span> : null}
      <span className="zhou-zhu">{t("calendar")}</span>
    </div>
  );
}

/**
 * 時辰：一個選單。十二個時辰（連早子、夜子，每個寫明喺呢個出生地、呢一日嘅鐘面時間，
 * `/api/slots` 逐分鐘計）、「記得準確時間」（出一格填時間）、「不知道時辰」。
 * 計唔到（server 壞咗）就淨係得準確時間同不知道。
 */
function TimeLine({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const t = useTranslations("juanzhou");
  const tc = useTranslations("cast");
  const shichen = useShichenWords();
  const open = isAnswered("date", draft) && isAnswered("place", draft);
  const [slots, setSlots] = useState<Slot[] | null | "loading">("loading");
  const [exact, setExact] = useState(() => Boolean(draft.time) && !draft.slot);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setSlots("loading");
    /* POST：出生日期唔入網址 */
    fetch("/api/slots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: draft.date, placeIndex: draft.placeIndex, timeBasis: draft.timeBasis ?? "birthplace" }),
    })
      .then((r) => (r.ok ? r.json() : { slots: null }))
      .then(
        (j: { slots: Slot[] | null }) => live && setSlots(j.slots),
        () => live && setSlots(null),
      );
    return () => {
      live = false;
    };
  }, [open, draft.date, draft.placeIndex, draft.timeBasis]);

  const list = Array.isArray(slots) ? slots : [];
  const value = draft.noHour ? "none" : exact ? "exact" : (draft.slot ?? "");

  return (
    <div className="zhou-shi">
      <select
        className="zhou-xian"
        aria-labelledby="zhou-time"
        disabled={!open}
        value={open ? value : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "none") {
            setExact(false);
            setDraft({ ...draft, noHour: true, slot: null, time: "" });
          } else if (v === "exact") {
            setExact(true);
            setDraft({ ...draft, noHour: false, slot: null, time: "" });
          } else {
            const slot = list.find((s) => slotSummary(s, shichen) === v);
            setExact(false);
            setDraft(slot ? { ...draft, noHour: false, slot: v, time: slot.pick } : { ...draft, slot: null, time: "" });
          }
        }}
      >
        <option value="">{!open ? t("timeWait") : slots === "loading" ? tc("slotsLoading") : t("timeChoose")}</option>
        {list.map((slot) => {
          const s = slotSummary(slot, shichen);
          return (
            <option key={s} value={s}>
              {slotName(slot, shichen)}　{slot.from}–{slot.to}
            </option>
          );
        })}
        {open ? <option value="exact">{t("exact")}</option> : null}
        {open ? <option value="none">{t("noHour")}</option> : null}
      </select>
      {open && exact ? (
        <input
          className="zhou-xian zhou-zhun"
          type="time"
          aria-label={tc("aria.time")}
          value={draft.time}
          onChange={(e) => setDraft({ ...draft, time: e.target.value, slot: null, noHour: false })}
        />
      ) : null}
      {/* R-007：呢句要出現喺畫面上 */}
      <p className="zhou-zhu">{draft.noHour ? tc("noHourComfort") : tc("timeHint")}</p>
    </div>
  );
}

/** 時辰嘅字（messages `shichen.*`） */
function useShichenWords(): ShichenWords {
  const t = useTranslations("shichen");
  return {
    branch: t.raw("branch") as string[],
    hour: (branch) => t("hour", { branch }),
    earlyZi: t("earlyZi"),
    lateZi: t("lateZi"),
    prevZi: t("prevZi"),
  };
}

/**
 * 日期或者出生地一改，揀咗嘅時辰就唔再啱：同一個時辰喺另一日、另一個地方
 * 對應唔同嘅鐘面時間。填準確時間就唔使清 —— 鐘面時間本身冇變。
 */
function clearSlot(draft: Draft): Partial<Draft> {
  return draft.slot ? { slot: null, time: "" } : {};
}
