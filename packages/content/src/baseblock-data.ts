/**
 * 基塊實例（工單 C4 / C5）
 *
 * C4 = 前六星 × 十二宮 = 72 條。C5 = 後八星 × 十二宮 = 96 條。
 * 加埋 168 格 —— 十四主星 × 十二宮，一格不缺。
 */
import c4 from './lexicon/base-c4.json';
import c5 from './lexicon/base-c5.json';
import { buildBaseBlocks, mostSimilar, PALACE_TOPIC, type BaseBlock } from './baseblock';

import cutTable from './lexicon/base-cuts.json';

/**
 * 刪句表（2026-11-11 英文審稿）：同一格前文已講過同一判斷嘅重述句，載入時刪走。
 * 原文照留喺 base-c4/c5.json。`GUANWEI_HISTORICAL_BASE=1` 時唔刪 —— 只畀樣本書存檔鎖用，
 * 等佢哋照舊生成同存檔逐字比對，其他程式一有改動照樣捉到。
 */
export const BASE_CUTS: readonly { id: string; cut: string }[] = cutTable.cuts;
export const HISTORICAL_BASE = typeof process !== 'undefined' && process.env?.GUANWEI_HISTORICAL_BASE === '1';

/** 每條刪句喺原文要剛好出現一次；唔係就 throw（原文改咗，刪句表要跟住覆核） */
export function applyBaseCuts<T extends { id: string; body: string }>(rows: T[]): T[] {
  return rows.map((r) => {
    let body = r.body;
    for (const c of BASE_CUTS.filter((x) => x.id === r.id)) {
      if (body.split(c.cut).length !== 2) throw new Error(`刪句表對唔上原文：${c.id}「${c.cut}」`);
      body = body.replace(c.cut, () => '');
    }
    return body === r.body ? r : { ...r, body };
  });
}

export const RAW_BASE_ROWS = [...c4, ...c5] as { id: string; body: string }[];

export const BASE_BLOCKS: BaseBlock[] = buildBaseBlocks(
  (HISTORICAL_BASE ? RAW_BASE_ROWS : applyBaseCuts(RAW_BASE_ROWS)) as unknown[],
);

export const C4_STARS = ['紫微', '天府', '太陽', '太陰', '武曲', '天機'] as const;
export const C5_STARS = ['天同', '廉貞', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'] as const;

export function baseBlockOf(star: string, palace: string): BaseBlock | null {
  return BASE_BLOCKS.find((b) => b.star === star && b.palace === palace) ?? null;
}

/** 168 格入面填咗幾多。呢個數應該公開。 */
export function baseCoverage() {
  const target = (C4_STARS.length + C5_STARS.length) * 12;
  const inSet = (set: readonly string[]) => BASE_BLOCKS.filter((b) => set.includes(b.star)).length;
  return { done: BASE_BLOCKS.length, target, c4: inSet(C4_STARS), c5: inSet(C5_STARS) };
}

export { mostSimilar, PALACE_TOPIC };
