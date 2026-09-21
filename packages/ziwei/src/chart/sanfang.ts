/**
 * 三方四正同空宮借星（工單 B14）
 *
 * 出處：docs/voice-spec.md §12 主題與宮位映射、§13 結構驗證
 *
 * 純結構，**唔做任何吉凶判斷**。呢層只回答「邊四個宮互相牽動」同
 * 「呢個宮係咪空宮、要借邊個」。點解讀係規則庫（工單 C2）嘅事。
 *
 * 呢個係規範 §16 嘅「結構驗證群」唯一嘅來源 ——
 * 冇佢，進／逆同盛／險嘅門檻永遠差一群。
 */
import { BRANCHES, type Branch, type Palace } from '../types';

/** 由本宮數起嘅偏移。 */
const OFFSETS = {
  /** 本宮 */
  ben: 0,
  /** 三合之一（本宮順數四位）—— 命宮嚟講就係財帛位 */
  sanheA: 4,
  /** 對宮（正沖） */
  dui: 6,
  /** 三合之二（本宮逆數四位）—— 命宮嚟講就係官祿位 */
  sanheB: 8,
} as const;

export type SanFang = {
  ben: Branch;
  sanheA: Branch;
  dui: Branch;
  sanheB: Branch;
};

const idx = (b: Branch) => BRANCHES.indexOf(b);
const at = (i: number) => BRANCHES[((i % 12) + 12) % 12]!;

/**
 * 一個宮嘅三方四正。
 *
 * 「四正」= 本宮 + 對宮，「三方」= 本宮 + 兩個三合宮。
 * 加埋就係四個宮：本、三合、對、三合。
 */
export function sanFangSiZheng(branch: Branch): SanFang {
  const i = idx(branch);
  return {
    ben: at(i + OFFSETS.ben),
    sanheA: at(i + OFFSETS.sanheA),
    dui: at(i + OFFSETS.dui),
    sanheB: at(i + OFFSETS.sanheB),
  };
}

/** 同上，回一個 array，次序：本 → 三合 → 對 → 三合。 */
export function sanFangBranches(branch: Branch): Branch[] {
  const s = sanFangSiZheng(branch);
  return [s.ben, s.sanheA, s.dui, s.sanheB];
}

/** 對宮。 */
export function oppositeBranch(branch: Branch): Branch {
  return at(idx(branch) + 6);
}

/**
 * 空宮 = 冇主星嘅宮。
 *
 * 輔星煞星唔計 —— 一個得擎羊陀羅嘅宮仍然係空宮。
 */
export function isEmptyPalace(p: Palace): boolean {
  return !p.stars.some((s) => s.kind === 'major');
}

/**
 * 標記空宮要借邊個宮。
 *
 * 空宮借對宮主星參看。呢個係三合派通行做法，
 * 而且**命書一定要明寫「此宮無主星，借對宮○○參看」**（內容系統 §6）——
 * 空宮本身就係訊息，照實講反而可信。
 *
 * 就地改 palaces（同 resolvePalaces 入面其他步驟一致）。
 */
export function markBorrowing(palaces: Palace[]): void {
  for (const p of palaces) {
    if (!isEmptyPalace(p)) {
      delete p.borrowsFrom;
      continue;
    }
    p.borrowsFrom = oppositeBranch(p.branch);
  }
}

/**
 * 攞一個宮嘅三方四正宮位物件。
 *
 * 畀規則庫（C2）同推理器（C8）用 —— 佢哋要嘅係宮，唔係地支。
 */
export function sanFangPalaces(palaces: Palace[], branch: Branch): Palace[] {
  const byBranch = new Map(palaces.map((p) => [p.branch, p]));
  return sanFangBranches(branch)
    .map((b) => byBranch.get(b))
    .filter((p): p is Palace => p !== undefined);
}

/**
 * 空宮借到嘅主星。
 *
 * 唔係空宮就回 null（**唔係空 array**）—— 呢個分別好重要：
 * 「冇借」同「借咗但對宮都冇主星」係兩件唔同嘅事。
 */
export function borrowedMajors(palaces: Palace[], branch: Branch): Palace['stars'] | null {
  const byBranch = new Map(palaces.map((p) => [p.branch, p]));
  const self = byBranch.get(branch);
  if (!self || !isEmptyPalace(self)) return null;
  const opp = byBranch.get(oppositeBranch(branch));
  return opp ? opp.stars.filter((s) => s.kind === 'major') : [];
}
