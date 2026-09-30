import { BRANCHES, type Branch, type Sihua } from '@guanwei/ziwei/contract';

/**
 * 命盤三層：本命、大限、流年（2026-09-30）
 *
 * 左頁個盤可以揀睇邊一層。**宮名跟層轉，星曜唔郁** —— 一粒星永遠坐喺佢出世嗰格，
 * 轉嘅係「呢一格喺呢十年／呢一年叫乜宮」同「邊幾粒星化祿權科忌」。
 *
 * ⚠ 呢個檔案唔准 import 引擎（`check-bundle.mjs`）。三層喺 server 計好
 * （`layers.server.ts`），呢度淨係一份平面嘅資料同幾個讀佢嘅函數。
 *
 * ⚠ 年份係**寫書嗰年**（R-008），唔係今日：同〈這十年〉〈這一年〉兩章講嘅係同一年。
 */

export type LayerKey = 'natal' | 'decadal' | 'annual';

export const LAYER_KEYS: readonly LayerKey[] = ['natal', 'decadal', 'annual'];

type Layer = {
  /** 呢一層嘅命宮喺邊個地支。 */
  ming: Branch;
  /** 地支 → 呢一層嘅宮名。 */
  names: Partial<Record<Branch, string>>;
  /** 星 → 呢一層化乜。 */
  sihua: Record<string, Sihua>;
};

export type ChartLayers = {
  year: number;
  ganzhi: string;
  nominalAge: number;
  /** 未起運就冇大限層。 */
  decadal: (Layer & { fromAge: number; toAge: number }) | null;
  annual: Layer;
};

/** 某一層有冇得揀：本命同流年一定有，大限要起咗運先有。 */
export function hasLayer(layers: ChartLayers | null, key: LayerKey): boolean {
  if (key === 'natal') return true;
  if (!layers) return false;
  return key === 'annual' || layers.decadal !== null;
}

export function layerOf(layers: ChartLayers | null, key: LayerKey): Layer | null {
  if (!layers || key === 'natal') return null;
  return key === 'annual' ? layers.annual : layers.decadal;
}

/**
 * 一章打開嗰陣個盤停喺邊層：〈這十年〉睇大限、〈這一年〉睇流年，其餘本命。
 * 讀者揀咗另一層就跟讀者（見 `BookSpread`）。
 */
export const CHAPTER_LAYER: Record<string, LayerKey> = {
  這十年: 'decadal',
  這一年: 'annual',
};

export function defaultLayer(slug: string, layers: ChartLayers | null): LayerKey {
  const want = CHAPTER_LAYER[slug] ?? 'natal';
  return hasLayer(layers, want) ? want : 'natal';
}

/** 呢一層嘅命宮地支索引（0–11）。本命層回 null —— 本命命宮由盤自己知。 */
export function layerMingIndex(layers: ChartLayers | null, key: LayerKey): number | null {
  const l = layerOf(layers, key);
  return l ? BRANCHES.indexOf(l.ming) : null;
}
