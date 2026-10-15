"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Juanzhou } from "@/components/Juanzhou";
import { checkPair } from "@/app/[locale]/cast/pair-actions";
import { EMPTY_DRAFT, toCastRequest, type Draft } from "@/lib/luokuan";

type Who = "A" | "B";

/**
 * 兩人對照 · 落款（2026-10-15 · Issac）
 *
 * 起盤頁揀「雙人」：兩幅卷軸並排（收細少少），左邊寫自己，右邊寫對方。
 * 每幅用返單人嗰幅 `Juanzhou` —— 欄位、生辰、時辰、計時、生地、性別一模一樣，
 * 唔另起爐灶。
 *
 * ⚠ 兩幅都落咗印先過關：
 *   一幅落咗印就停喺度（`hold`），印仲睇得到；改返佢任何一格，個印就揭返起。
 *   兩幅齊印 → server 核一次（`checkPair`，同單人一樣嘅核法）→ 兩幅一齊捲埋 → 快將推出。
 *   核唔過：嗰幅揭返印，錯誤寫喺佢自己個印旁邊。
 *
 * ⚠ 對方同意（2026-10-14 定落）：右幅卷尾之前一格，冇剔唔准落印。
 *   對照頁未有，所以兩個生辰都**唔存**（見 `pair-actions.ts`）。
 */
export function HepanLuokuan({ onSingle, onPassed }: { onSingle: () => void; onPassed: () => void }) {
  const t = useTranslations("hepan");
  const tc = useTranslations("cast");
  const [drafts, setDrafts] = useState<Record<Who, Draft>>({ A: EMPTY_DRAFT, B: EMPTY_DRAFT });
  const [sealed, setSealed] = useState<Record<Who, boolean>>({ A: false, B: false });
  const [errors, setErrors] = useState<Record<Who, string | null>>({ A: null, B: null });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  /* 核過咗：放手畀兩幅捲埋 */
  const [passed, setPassed] = useState(false);
  const [folded, setFolded] = useState<Record<Who, boolean>>({ A: false, B: false });

  const errorOf = (code: string) => (tc.has(`errors.${code}`) ? tc(`errors.${code}`) : tc("errors.NOT_IMPLEMENTED"));

  /* 改咗就揭返個印：落印係確認，確認過嘅嘢唔可以靜靜雞變 */
  const edit = (who: Who) => (d: Draft) => {
    setDrafts((x) => ({ ...x, [who]: d }));
    setSealed((x) => ({ ...x, [who]: false }));
    setErrors((x) => ({ ...x, [who]: null }));
  };

  async function seal(who: Who) {
    const now = { ...sealed, [who]: true };
    setSealed(now);
    setErrors((x) => ({ ...x, [who]: null }));
    if (!now.A || !now.B) return;

    const a = toCastRequest({ ...drafts.A, nameless: true });
    const b = toCastRequest({ ...drafts.B, nameless: true });
    if (!a || !b) return;
    setBusy(true);
    const result = await checkPair(a, b).catch(() => ({ ok: false, who, code: "NOT_IMPLEMENTED" }) as const);
    setBusy(false);
    if (result.ok) {
      setPassed(true);
      onPassed();
      return;
    }
    setSealed((x) => ({ ...x, [result.who]: false }));
    setErrors((x) => ({ ...x, [result.who]: errorOf(result.code) }));
  }

  if (folded.A && folded.B) {
    const name = (who: Who) => drafts[who].name.trim() || t(who === "A" ? "you" : "them");
    return (
      <div className="mu-wei">
        <div className="hepan-hou max-w-banxin">
          <p className="font-sans text-cap tracking-[0.2em] text-ink-3">{t("soonTitle")}</p>
          <p className="mt-6 text-h2 font-semibold tracking-[0.18em]">
            {name("A")}　×　{name("B")}
          </p>
          <p className="mt-6 text-body leading-[1.95] text-ink-2">{t("soonBody1")}</p>
          <p className="mt-4 text-body leading-[1.95] text-ink-2">{t("soonBody2")}</p>
          <button type="button" className="btn-ye mt-8" onClick={onSingle}>
            {t("soonBack")}
            <span className="btn-jiantou" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hepan-zhou">
      {(["A", "B"] as const).map((who) => (
        <Juanzhou
          key={who}
          title={t(`title${who}`)}
          lead={t(`lead${who}`)}
          draft={drafts[who]}
          setDraft={edit(who)}
          onSeal={() => seal(who)}
          sealed={sealed[who]}
          hold={!passed}
          busy={busy}
          error={errors[who]}
          onFolded={() => setFolded((x) => ({ ...x, [who]: true }))}
          gate={who === "B" ? { ok: agreed, hint: t("agreeHint") } : undefined}
          hints={{ ready: t("readyHint"), noHour: t("noHour"), sealed: passed ? undefined : t(sealed[who === "A" ? "B" : "A"] ? "checking" : "waitOther") }}
          extra={
            who === "B" ? (
              <label className="hepan-yi">
                <input
                  type="checkbox"
                  checked={agreed}
                  disabled={sealed.B}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>{t("agree")}</span>
              </label>
            ) : null
          }
        />
      ))}
    </div>
  );
}
