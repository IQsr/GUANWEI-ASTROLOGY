import 'server-only';
import { annual, type Chart } from '@guanwei/ziwei';
import type { ChartLayers } from './layers';

/**
 * 由本命盤同寫書嗰年計大限、流年兩層（`layers.ts`）。
 *
 * ⚠ 淨係 server 行：引擎唔准落 client bundle。算出嚟係一份平面資料，交畀左頁個盤。
 * ⚠ `year` 同成書嗰陣畀 `annual()` 嘅一樣（`cast/actions.ts`），兩章同個盤先講同一年。
 */
export function chartLayers(chart: Chart, year: number): ChartLayers | null {
  const r = annual(chart, year);
  if (!r.ok) return null;
  const A = r.value;
  const decadalNames = Object.fromEntries(A.overlay.filter((o) => o.decadal).map((o) => [o.branch, o.decadal!]));
  const annualNames = Object.fromEntries(A.overlay.map((o) => [o.branch, o.annual]));
  const hua = (hits: { star: string; hua: ChartLayers['annual']['sihua'][string] }[]) =>
    Object.fromEntries(hits.map((h) => [h.star, h.hua]));
  return {
    year,
    ganzhi: A.ganzhi.join(''),
    nominalAge: A.nominalAge,
    decadal: A.decadal
      ? {
          ming: A.decadal.branch,
          fromAge: A.decadal.fromAge,
          toAge: A.decadal.toAge,
          names: decadalNames,
          sihua: hua(A.sihua.decadal ?? []),
        }
      : null,
    annual: { ming: A.mingGong, names: annualNames, sihua: hua(A.sihua.annual) },
  };
}
