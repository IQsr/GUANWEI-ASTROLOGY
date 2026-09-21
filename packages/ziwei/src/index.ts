/**
 * @guanwei/ziwei — 觀微紫微斗數排盤引擎
 *
 * 本命盤 + 大限已經排得出（工單 B1、B3–B10）。
 * cast() 係唯一對外入口；resolveBirthMoment / resolveFourPillars /
 * resolvePalaces 係中途結果，畀測試同 UI 用。
 *
 * 錯誤一律用 result type，唔 throw —— 呢個係契約嘅一部分。
 * 落實次序見 project doc《觀微 排盤引擎 v0.1》第十節。
 */

export * from './types';
export { DEFAULT_RULES, resolveRules } from './rules';
export * from './calendar';
export * from './ganzhi';
export * from './chart';

import type { BirthInput, Chart, Decadal, PartialChart, Result } from './types';
import { resolveRules } from './rules';
import { lunarFromDayIndex, type LunarDate } from './calendar/lunar';
import { resolveMoment, type ResolvedMoment } from './calendar/shichen';
import { tzOffsetMinutes } from './calendar/timezone';
import { daysFromEpoch } from './calendar/time';
import { fourPillars, type FourPillars } from './ganzhi/four-pillars';
import { buildPalaces, type PalaceLayout } from './chart/palaces';
import { placeMajorStars } from './chart/major-stars';
import { placeAuxStars } from './chart/aux-stars';
import { brightnessOf } from './chart/brightness';
import { sihuaOfStar } from './chart/sihua';
import { buildDecadals } from './chart/decadal';
import { monthForPalace } from './chart/palaces';
import { TABLES_CHECKSUM } from './calendar/tables';
import { markBorrowing } from './chart/sanfang';
import { buildSchoolProfile } from './school-profile';

/**
 * 引擎版本。任何會改變輸出嘅改動 = 至少 minor bump。
 * 舊盤唔會自動重算：呢個字串要跟住每個 chart 存落 DB（見 R-008 / 工單 B16）。
 *
 * 0.2.0 —— 工單 B13 / B14：
 *   meta 多咗 schoolProfile（規範 §17 必要欄位）
 *   空宮會填 borrowsFrom（三方四正同借星）
 *
 * 0.3.0 —— 工單 B15：
 *   新增流年層 annual() —— 流年宮位、流年四化、大限四化、三層疊宮
 *   cast() 本身嘅輸出冇變，但 schoolProfile 變咗（流年由 not-implemented 轉 enabled），
 *   而 schoolProfile 喺每個 chart 嘅 meta 度 —— 所以呢個係會改變輸出嘅改動
 */
export const ENGINE_VERSION = '0.3.0';

export * from './school-profile';

/**
 * 呢個引擎排出嚟嘅盤，屬於邊個流派設定（工單 B13）。
 *
 * 規範 §17 要求每個結論物件填 `school_profile_id`，而且唔准用 latest。
 * `SCHOOL_PROFILE.ref` 就係嗰個值 —— 佢帶住 fingerprint，
 * 所以規則、四化表、萬年曆或者引擎版本一改，佢就變。
 */
export const SCHOOL_PROFILE = buildSchoolProfile('zhongzhou-v1', ENGINE_VERSION);

export { TABLES_META, TABLES_DIVERGENCE } from './calendar/tables';
export { TABLES_CHECKSUM } from './calendar/tables';

/** 萬年曆涵蓋範圍（國曆年）。範圍外要優雅失敗，唔好 throw。 */
export const SUPPORTED_YEARS = { from: 1900, to: 2100 } as const;

/** 時辰中點（分鐘）：只知時辰、唔知準確時間時用。子時取 00:00。 */
const SHICHEN_MID_MINUTES = [0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320];

/**
 * B1 落實嘅一層：由出生資料解出「排盤用嘅日、農曆日期、時辰」。
 *
 * 呢個係 cast() 嘅第一步，亦都係曆法層唯一嘅對外入口。
 * 之後 B4 起嘅干支同斗數層全部食呢個結果。
 */
export function resolveBirthMoment(
  input: BirthInput,
): Result<{ moment: ResolvedMoment; lunar: LunarDate; tzOffsetMinutes: number }> {
  const rules = resolveRules(input.options);

  const clock =
    'shichen' in input.time
      ? { h: Math.floor(SHICHEN_MID_MINUTES[input.time.shichen]! / 60), min: 0 }
      : { h: input.time.h, min: input.time.min };

  const off = tzOffsetMinutes(input.tz, input.solar.y, input.solar.m, input.solar.d, clock.h, clock.min);
  if (off === null) {
    return { ok: false, code: 'BAD_TIMEZONE', message: `認唔到時區 ${input.tz}。` };
  }

  const moment = resolveMoment(input.solar, clock, input.place.lng, off, {
    // 只知時辰、唔知準確時間嘅話，真太陽時校正冇意義（本身已經係 2 小時一格）
    trueSolarTime: rules.trueSolarTime && !('shichen' in input.time),
    lateZiHour: rules.lateZiHour,
  });
  if (!moment.ok) return moment;

  const lunar = lunarFromDayIndex(moment.value.dayIndex);
  if (!lunar.ok) return lunar;

  return { ok: true, value: { moment: moment.value, lunar: lunar.value, tzOffsetMinutes: off } };
}

/**
 * B4 落實嘅一層：四柱干支。
 *
 * 注意月柱同年柱用嘅時間基準唔同 ——
 *   月柱以「節」為界，用真實出生瞬間（節氣係物理時刻）
 *   年柱以正月初一為界（R-001），用調整後嘅農曆年
 * 呢個唔係 bug，係兩套曆嘅定義本來就唔同。
 */
export function resolveFourPillars(
  input: BirthInput,
): Result<{ pillars: FourPillars; moment: ResolvedMoment; lunar: LunarDate }> {
  const base = resolveBirthMoment(input);
  if (!base.ok) return base;
  const rules = resolveRules(input.options);
  const { moment, lunar, tzOffsetMinutes: off } = base.value;

  const clockMinutes =
    'shichen' in input.time
      ? SHICHEN_MID_MINUTES[input.time.shichen]!
      : input.time.h * 60 + input.time.min;
  const utcMinutes =
    daysFromEpoch(input.solar.y, input.solar.m, input.solar.d) * 1440 + clockMinutes - off;

  const p = fourPillars({
    dayIndex: moment.dayIndex,
    shichen: moment.shichen,
    utcMinutes,
    lunarYear: lunar.y,
    yearBoundary: rules.yearBoundary,
  });
  if (!p.ok) return p;

  return { ok: true, value: { pillars: p.value, moment, lunar } };
}

/**
 * B6 落實嘅一層：十二宮同五行局。
 *
 * 由此開始就係「斗數層」—— 上面兩層（曆法、干支）中國曆法通用，
 * 呢層先係斗數自己嘅嘢。
 */
export function resolvePalaces(
  input: BirthInput,
): Result<{
  layout: PalaceLayout;
  decadals: Decadal[];
  pillars: FourPillars;
  moment: ResolvedMoment;
  lunar: LunarDate;
}> {
  const base = resolveFourPillars(input);
  if (!base.ok) return base;
  const { pillars, moment, lunar } = base.value;

  const layout = buildPalaces({
    yearStem: pillars.year.stem,
    lunarMonth: lunar.m,
    lunarDay: lunar.d,
    isLeapMonth: lunar.isLeapMonth,
    shichen: moment.shichen,
  });
  if (!layout.ok) return layout;

  // B7：十四主星落宮。安紫微用嘅農曆日係經過早／晚子時調整之後嗰一日。
  const stars = placeMajorStars(layout.value.wuxingJu, lunar.d);
  if (!stars.ok) return stars;
  for (const s of stars.value) {
    // B9：主星落宮之後即刻查廟旺。輔星煞星暫時唔標廟旺。
    const brightness = brightnessOf(s.name, s.branch) ?? undefined;
    layout.value.palaces[s.branchIndex]!.stars.push({ name: s.name, kind: 'major', brightness });
  }

  // B8：六吉、六煞、祿存、天馬。生月用同安命宮一樣嘅閏月處理（R-006）。
  const aux = placeAuxStars({
    yearStem: pillars.year.stem,
    yearBranch: pillars.year.branch,
    lunarMonth: monthForPalace(lunar.m, lunar.d, lunar.isLeapMonth),
    shichen: moment.shichen,
  });
  if (!aux.ok) return aux;
  for (const s of aux.value) {
    layout.value.palaces[s.branchIndex]!.stars.push({ name: s.name, kind: 'aux' });
  }

  // B10：四化。生年天干定，貼落已經落宮嘅星上面（主星輔星都可能中）。
  for (const p of layout.value.palaces) {
    for (const s of p.stars) {
      const hua = sihuaOfStar(pillars.year.stem, s.name);
      if (hua) s.sihua = hua;
    }
  }

  // B14：空宮借對宮主星。要喺主星落宮之後先做得 ——
  // 空宮嘅定義係「冇主星」，輔星煞星唔計。
  markBorrowing(layout.value.palaces);

  // B10：大限。由命宮起，陽男陰女順行、陰男陽女逆行，起運歲 = 局數。
  const decadals = buildDecadals({
    mingGong: layout.value.mingGong,
    wuxingJu: layout.value.wuxingJu,
    yearStem: pillars.year.stem,
    sex: input.sex,
  });

  return { ok: true, value: { layout: layout.value, decadals, pillars, moment, lunar } };
}

/**
 * 排一個完整本命盤。
 *
 * 純函數：同一個 input 喺任何機器任何時候都出同一個 output。
 * `computedAt` 由呼叫者傳入 —— 引擎入面唔准有 new Date()。
 */
export function cast(input: BirthInput, computedAt?: string): Result<Chart> {
  const r = resolvePalaces(input);
  if (!r.ok) return r;
  const { layout, decadals, pillars, moment, lunar } = r.value;

  return {
    ok: true,
    value: {
      meta: {
        engineVersion: ENGINE_VERSION,
        schoolProfile: SCHOOL_PROFILE.ref,
        rules: resolveRules(input.options),
        ...(computedAt ? { computedAt } : {}),
        tablesChecksum: TABLES_CHECKSUM,
      },
      lunar: {
        y: lunar.y,
        m: lunar.m,
        d: lunar.d,
        isLeapMonth: lunar.isLeapMonth,
        shichen: moment.shichen,
      },
      ganzhi: {
        year: [pillars.year.stem, pillars.year.branch],
        month: [pillars.month.stem, pillars.month.branch],
        day: [pillars.day.stem, pillars.day.branch],
        hour: [pillars.hour.stem, pillars.hour.branch],
      },
      wuxingJu: layout.wuxingJu,
      mingGong: layout.mingGong,
      shenGong: layout.shenGong,
      palaces: layout.palaces,
      decadals,
    },
  };
}

/**
 * 唔知時辰嘅入口：只算年月日層資料，唔回宮位。
 *
 * 呢個唔係 error path —— 架構 plan 嘅「未題名」虛線書脊食呢個。
 * 冇時辰就定唔到命宮，所以唔會扮有盤畀你。
 */
export function castPartial(
  input: Omit<BirthInput, 'time'>,
  computedAt?: string,
): Result<PartialChart> {
  // 用正午做代表時間去查農曆日同年月柱 —— 時柱唔會出。
  const withNoon: BirthInput = { ...input, time: { h: 12, min: 0 } };
  const base = resolveFourPillars(withNoon);
  if (!base.ok) return base;
  const { pillars, moment, lunar } = base.value;

  return {
    ok: true,
    value: {
      meta: {
        engineVersion: ENGINE_VERSION,
        schoolProfile: SCHOOL_PROFILE.ref,
        rules: resolveRules(input.options),
        ...(computedAt ? { computedAt } : {}),
        tablesChecksum: TABLES_CHECKSUM,
      },
      lunar: {
        y: lunar.y,
        m: lunar.m,
        d: lunar.d,
        isLeapMonth: lunar.isLeapMonth,
        shichen: moment.shichen,
      },
      ganzhi: {
        year: [pillars.year.stem, pillars.year.branch],
        month: [pillars.month.stem, pillars.month.branch],
        day: [pillars.day.stem, pillars.day.branch],
      },
    },
  };
}
