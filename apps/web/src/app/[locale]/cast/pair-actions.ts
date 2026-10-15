'use server';

import { cast, castPartial } from '@guanwei/ziwei';
import { parseCastRequest } from '@/lib/luokuan';

/**
 * 兩人對照：核兩個生辰（2026-10-15 · Issac：起盤頁加「雙人」，兩幅卷軸都落咗印先過關）
 *
 * 對照頁未寫好，所以呢度**淨係核**：同單人落款行同一套 —— `parseCastRequest` 逐格核，
 * 再過一次引擎（萬年曆範圍、時區呢啲引擎先知嘅錯）。
 *
 * ⚠ 唔寫 DB、唔留盤、唔回個盤返去。
 * 對方嘅生辰係對方嘅資料（2026-10-14 定落：要對方同意，只為嗰一頁用）；
 * 未有對照頁之前，冇理由留住佢。
 */
export type PairCheck = { ok: true } | { ok: false; who: 'A' | 'B'; code: string };

export async function checkPair(a: unknown, b: unknown): Promise<PairCheck> {
  for (const [who, raw] of [['A', a], ['B', b]] as const) {
    const req = parseCastRequest(raw);
    if (!req) return { ok: false, who, code: 'BAD_REQUEST' };
    const base = { solar: req.solar, tz: req.tz, place: req.place, sex: req.sex };
    const result = req.time
      ? cast({ ...base, time: req.time, options: { timeBasis: req.timeBasis } })
      : castPartial(base);
    if (!result.ok) return { ok: false, who, code: result.code };
  }
  return { ok: true };
}
