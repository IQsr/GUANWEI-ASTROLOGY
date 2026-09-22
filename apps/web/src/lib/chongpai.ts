/**
 * 重排：一本舊書同而家嘅引擎差幾多（工單 B16 · docs/rules.md R-008）
 *
 * ── ⚠ 呢個檔淨係識比較，唔識改嘢 ──
 *
 * R-008：**舊盤唔自動重算。** 一本書排出嚟嗰一刻，三個版本值鎖死。
 *
 * 所以呢度冇一個叫 `recast()`、`upgrade()` 或者 `sync()` 嘅 function。
 * 唔係「暫時未寫」—— 係**呢一層唔應該有**：一個識改嘅 module，
 * 遲早會有人喺一個 loading 入面叫佢，而嗰下就係一本書自己變咗。
 *
 * `/account` 嗰個「以新版引擎重排」（工單 G4）要做嘅係：
 * 攞呢度嘅差異、並列新舊、**由用戶揀**，然後**造一本新書**，
 * 唔係改舊嗰本。舊嗰本要仲喺度 —— 否則「唔自動改」只係推遲咗一下。
 */

/** 一本書排出嚟嗰一刻鎖死嘅三個值。 */
export type Pinned = {
  engine: string;
  school: string;
  content: string;
};

export type DriftField = 'engine' | 'school' | 'content';

export type Drift = {
  field: DriftField;
  was: string;
  now: string;
};

/**
 * ⚠ 三個版本各自講一件唔同嘅事，所以要分開講。
 *
 * 合成一句「有更新」嘅話，用戶唯一做得到嘅反應就係撳「更新」——
 * 而佢唔知自己換緊乜。
 */
export const DRIFT_LABEL: Record<DriftField, string> = {
  engine: '排盤引擎',
  school: '流派設定',
  content: '命書內容',
};

/** 換咗會點 —— 一句人話，唔係版本號。 */
export const DRIFT_MEANS: Record<DriftField, string> = {
  engine: '盤面可能有格會唔同',
  school: '四化、廟旺這類流派選擇可能有改動',
  content: '文字可能改寫過，盤面不變',
};

export function drift(pinned: Pinned, current: Pinned): Drift[] {
  const fields: DriftField[] = ['engine', 'school', 'content'];
  return fields
    .filter((f) => pinned[f] !== current[f])
    .map((field) => ({ field, was: pinned[field], now: current[field] }));
}

/**
 * ⚠ 「冇差異」同「答唔到」唔同。
 *
 * 一本書如果三個欄有任何一個係空，我哋根本唔知佢係邊一版排嘅 ——
 * 嗰陣唔可以話「同最新一樣」。R-008 個政策靠「每本書講得出自己
 * 係邊一版排嘅」撐住，講唔出就係一個要修嘅資料問題，唔係一個好消息。
 */
export function pinnedOf(raw: Partial<Pinned> | null | undefined): Pinned | null {
  if (!raw) return null;
  const { engine, school, content } = raw;
  if (!engine || !school || !content) return null;
  /* 規範 §17：版本欄唔准 latest。一本寫住 latest 嘅書等於冇寫。 */
  if ([engine, school, content].some((v) => v === 'latest')) return null;
  return { engine, school, content };
}
