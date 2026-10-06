/**
 * 落款（工單 E4 · 架構 §3 · rules.md R-007）
 *
 * 2026-10-06 起落款係一幅卷軸（`components/Juanzhou.tsx`），五樣一版過寫晒：
 *
 *   姓名　　可以留空；書上寫「無名」
 *   生辰　　國曆年月日；引擎內部轉農曆，唔好要用戶自己轉
 *   生地　　真太陽時校正（經度）＋ 時區
 *   時辰　　揀一個時辰（寫明鐘面幾點到幾點）、或者填準確時間、或者「唔知」→ 入分支
 *   性別　　大限順逆靠陰陽男女
 *
 * ⚠ 時辰一定喺生地之後：時辰選項要知出生地先計得出（見 `lib/slots.ts`）。
 *
 * ⚠ 呢個檔淨係管**答咗未**同砌／核排盤請求，唔管畫面，亦都唔識排盤 ——
 * 排盤喺 server action（架構 §9：引擎唔准落 client bundle）。
 */


export const STEPS = ['name', 'date', 'place', 'time', 'sex'] as const;
export type Step = (typeof STEPS)[number];

export type Sex = 'male' | 'female';

export type Draft = {
  /** 可以留空：留空嘅書叫「無名命書」（`lib/chengshu.ts` `NAMELESS`）。 */
  name: string;
  /**
   * 留空之後撳咗「下一步」。冇呢格嘅話，空名一開頁就當答咗，
   * 成個流程會由第二步開始 —— 要佢見過姓名嗰步先算。
   */
  nameless?: boolean;
  /** 國曆 yyyy-mm-dd。 */
  date: string;
  /** hh:mm。`noHour` 為 true 嗰陣冇意思。揀時辰嗰陣係嗰段嘅中間一分鐘。 */
  time: string;
  /**
   * 揀咗邊個時辰（已答嗰行用，例如「未時 · 13:36–15:35」）。
   * 填準確時間就係 null。出生日期或者出生地一改，呢格就要清 ——
   * 同一個時辰喺另一日、另一個地方對應唔同嘅鐘面時間。
   */
  slot: string | null;
  /** 唔知時辰。 */
  noHour: boolean;
  placeIndex: number | null;
  sex: Sex | null;
  /**
   * 時辰以邊度嘅時間定（2026-10-06，R-004，Issac：兩樣都做，畀用戶揀）：
   * birthplace = 出生地真太陽時（預設）；luoyang = 中州派講義嘅洛陽時間。
   */
  timeBasis?: TimeBasis;
};

export type TimeBasis = 'birthplace' | 'luoyang';

export const EMPTY_DRAFT: Draft = {
  name: '',
  date: '',
  time: '',
  slot: null,
  noHour: false,
  placeIndex: null,
  sex: null,
  timeBasis: 'birthplace',
};

/** 出生地：時區同經度。經度用嚟做真太陽時校正（R-007）。 */
/*
 * ⚠ `label` 係資料，唔係介面文案：佢會交畀引擎、寫落本書（「出生地 香港」），
 * 所以一直係中文。畫面上嗰個名由 `key` 查 messages（`places.*`）。
 */
export const PLACES = [
  { key: 'hongKong', label: '香港', tz: 'Asia/Hong_Kong', lng: 114.17, lat: 22.32 },
  { key: 'guangzhou', label: '廣州', tz: 'Asia/Shanghai', lng: 113.26, lat: 23.13 },
  { key: 'taipei', label: '台北', tz: 'Asia/Taipei', lng: 121.57, lat: 25.03 },
  { key: 'singapore', label: '新加坡', tz: 'Asia/Singapore', lng: 103.82, lat: 1.35 },
  { key: 'london', label: '倫敦', tz: 'Europe/London', lng: -0.13, lat: 51.51 },
  { key: 'newYork', label: '紐約', tz: 'America/New_York', lng: -74.01, lat: 40.71 },
] as const;

/*
 * ⚠ 時間欄嗰句（rules.md R-007）而家喺 messages：`cast.timeHint`。
 * 「不用自己調夏令時」同「出世紙」兩樣一定要有，`test/luokuan.test.ts` 量住。
 */

export function isAnswered(step: Step, draft: Draft): boolean {
  switch (step) {
    case 'name':
      return draft.name.trim().length <= 40 && (draft.name.trim().length > 0 || draft.nameless === true);
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(draft.date);
    /* 「唔知時辰」都係一個答案 —— 佢唔係跳過，佢係揀咗一條分支。 */
    case 'time':
      return draft.noHour || /^\d{2}:\d{2}$/.test(draft.time);
    case 'place':
      return draft.placeIndex !== null && draft.placeIndex in PLACES;
    case 'sex':
      return draft.sex !== null;
  }
}

/** 寫齊未（姓名留空要撳過落印先算答咗：`nameless`）。唔齊就唔排盤。 */
export function isComplete(draft: Draft): boolean {
  return STEPS.every((s) => isAnswered(s, draft));
}

export type CastRequest = {
  solar: { y: number; m: number; d: number };
  time: { h: number; min: number } | null;
  tz: string;
  place: { lng: number; lat: number; label: string };
  sex: Sex;
  timeBasis: TimeBasis;
};

/**
 * 由草稿砌一個排盤請求。答唔齊就回 null ——
 * **唔好補一個預設值落去**：一個「大概」嘅生辰排出嚟嘅盤，
 * 同一個亂作嘅盤冇分別。
 */
export function toCastRequest(draft: Draft): CastRequest | null {
  if (!isComplete(draft)) return null;
  const [y, m, d] = draft.date.split('-').map(Number);
  const place = PLACES[draft.placeIndex!]!;
  const clock = draft.noHour ? null : draft.time.split(':').map(Number);

  return {
    solar: { y: y!, m: m!, d: d! },
    time: clock ? { h: clock[0]!, min: clock[1]! } : null,
    tz: place.tz,
    place: { lng: place.lng, lat: place.lat, label: place.label },
    sex: draft.sex!,
    timeBasis: draft.timeBasis ?? 'birthplace',
  };
}

/**
 * ⚠ 由外面收返嚟嘅排盤請求，要逐格核過。
 *
 * server action 唔係一個「function call」—— 佢係一個**公開 HTTP endpoint**。
 * 任何人都 post 得到任何嘢入去，唔會經過上面五步，亦都唔會經過個 UI。
 *
 * 所以呢度唔信 `CastRequest` 呢個型別（型別喺 runtime 冇效力），
 * 逐格核：年份要喺萬年曆範圍、時分要合法、經緯度要喺地球上面、
 * 時區要係我哋張表入面嗰幾個。
 *
 * 時區特別緊要：佢決定夏令時同真太陽時校正，而一個亂填嘅時區
 * 排出嚟嘅盤**照樣排得出**，只係錯 —— 錯得睇唔出。
 */
const TZ = new Set(PLACES.map((p) => p.tz));

export function parseCastRequest(raw: unknown): CastRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const solar = r.solar as Record<string, unknown> | undefined;
  const place = r.place as Record<string, unknown> | undefined;
  if (!solar || !place) return null;

  const int = (v: unknown, lo: number, hi: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;

  /* 萬年曆範圍 1900–2100（引擎 SUPPORTED_YEARS）。範圍外引擎自己會回
     OUT_OF_RANGE，但喺呢度擋住就唔使行成個引擎先知。 */
  const y = int(solar.y, 1900, 2100);
  const m = int(solar.m, 1, 12);
  const d = int(solar.d, 1, 31);
  if (y === null || m === null || d === null) return null;

  let time: CastRequest['time'] = null;
  if (r.time !== null && r.time !== undefined) {
    const t = r.time as Record<string, unknown>;
    const h = int(t.h, 0, 23);
    const min = int(t.min, 0, 59);
    if (h === null || min === null) return null;
    time = { h, min };
  }

  if (typeof r.tz !== 'string' || !TZ.has(r.tz as (typeof PLACES)[number]['tz'])) return null;

  const lng = num(place.lng, -180, 180);
  const lat = num(place.lat, -90, 90);
  if (lng === null || lat === null) return null;
  if (typeof place.label !== 'string' || place.label.length > 40) return null;

  if (r.sex !== 'male' && r.sex !== 'female') return null;

  /* 冇帶就係預設（出生地）；帶咗就一定要係兩個之一 */
  const timeBasis = r.timeBasis === undefined ? 'birthplace' : r.timeBasis;
  if (timeBasis !== 'birthplace' && timeBasis !== 'luoyang') return null;

  return { solar: { y, m, d }, time, tz: r.tz, place: { lng, lat, label: place.label }, sex: r.sex, timeBasis };
}
