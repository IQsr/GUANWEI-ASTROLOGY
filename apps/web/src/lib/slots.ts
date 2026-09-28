/**
 * 時辰選項：揀一個時辰，唔使填準確時間（落款）
 *
 * ── 點解唔係「兩點到三點」一個鐘一格 ──
 *
 * 引擎做真太陽時校正（經度 ＋ 均時差，R-007）。香港真太陽時比鐘面慢
 * 大約 8–38 分鐘，而時辰嘅分界喺單數鐘頭。一個鐘一格嘅話，由單數鐘頭開始
 * 嗰啲（例如 3–4 點）校正之後會跨兩個時辰 —— 排唔到一個確定嘅命宮。
 *
 * 所以反過嚟：**每個選項啱啱好係一個時辰**，旁邊寫明喺呢個出生地、呢一日，
 * 嗰個時辰對應鐘面幾點到幾點。揀咗就用嗰段嘅中間一分鐘去排盤。
 *
 * ── 點計 ──
 *
 * 唔自己反推公式：將出生當日鐘面 00:00–23:59 逐分鐘交畀引擎
 * （`resolveBirthMoment`，同真正排盤同一條路），睇每分鐘落邊一日、邊個時辰。
 * 連續落同一格嘅就係一個選項。夏令時、均時差、早晚子時規則全部跟引擎。
 *
 * 所以一日通常有 13 格：子時會喺頭尾各出一次 —— 凌晨嗰個屬今日，
 * 夜晚 23 點幾嗰個按「晚子時歸翌日」屬聽日，兩個盤唔同。
 *
 * 呢個檔係純函數：`resolve` 由 caller 畀（server 用引擎，test 用假嘅）。
 */

export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export type Slot = {
  /** 邊個時辰（0 = 子）。 */
  shichen: number;
  /** 排盤落邊一日（引擎嘅日序）。同一個時辰兩日就係兩格。 */
  dayIndex: number;
  /** 鐘面時間 hh:mm，頭一分鐘。 */
  from: string;
  /** 鐘面時間 hh:mm，最後一分鐘。 */
  to: string;
  /** 用嚟排盤嘅一分鐘：呢段嘅中間。 */
  pick: string;
  /**
   * 排盤嗰日同出生當日差幾多日：0 = 當日；1 = 翌日（夜晚子時，預設「晚子時歸翌日」）；
   * −1 = 前一日（學派設「晚子時屬當日」嗰陣，凌晨頭幾分鐘仲係前一晚嘅子時）。
   * 基準係正午嗰格 —— 正午永遠屬當日。
   */
  dayOffset: number;
};

export type Resolve = (clockMinute: number) => { shichen: number; dayIndex: number } | null;

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** 將一日 1440 分鐘分成時辰選項。任何一分鐘解唔到就回 null（例如年份超出範圍）。 */
export function slotsOfDay(resolve: Resolve): Slot[] | null {
  const runs: { shichen: number; dayIndex: number; start: number; end: number }[] = [];
  for (let m = 0; m < 1440; m++) {
    const r = resolve(m);
    if (!r) return null;
    const last = runs.at(-1);
    if (last && last.shichen === r.shichen && last.dayIndex === r.dayIndex && last.end === m - 1) {
      last.end = m;
    } else {
      runs.push({ shichen: r.shichen, dayIndex: r.dayIndex, start: m, end: m });
    }
  }

  const noon = runs.find((r) => r.start <= 720 && r.end >= 720)!;
  return runs.map((r) => ({
    shichen: r.shichen,
    dayIndex: r.dayIndex,
    from: hhmm(r.start),
    to: hhmm(r.end),
    pick: hhmm(Math.floor((r.start + r.end) / 2)),
    dayOffset: r.dayIndex - noon.dayIndex,
  }));
}

/**
 * 畫面上嗰個名：「未時」。子時一日有兩格，用返傳統叫法：
 * 凌晨嗰格「早子時」，夜晚 23 點幾嗰格「夜子時」（預設歸翌日排盤）。
 * 學派設「晚子時屬當日」嗰陣，凌晨頭幾分鐘係前一晚嘅子時 —— 寫「子時（前夜）」。
 */
export function slotName(slot: Pick<Slot, 'shichen' | 'dayOffset' | 'from'>): string {
  if (slot.shichen !== 0) return `${BRANCHES[slot.shichen]}時`;
  if (slot.dayOffset < 0) return '子時（前夜）';
  return slot.from < '12:00' ? '早子時' : '夜子時';
}

/** 已答嗰行：「未時 · 13:36–15:35」。 */
export function slotSummary(slot: Pick<Slot, 'shichen' | 'dayOffset' | 'from' | 'to'>): string {
  return `${slotName(slot)} · ${slot.from}–${slot.to}`;
}
