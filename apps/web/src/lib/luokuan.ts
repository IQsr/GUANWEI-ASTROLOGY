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
export const PLACE_REGIONS = ['gat', 'cn', 'sea', 'asia', 'eu', 'na', 'oc'] as const;
export type PlaceRegion = (typeof PLACE_REGIONS)[number];

export const PLACES = [
  { key: 'hongKong', label: '香港', tz: 'Asia/Hong_Kong', lng: 114.17, lat: 22.32, region: 'gat' },
  { key: 'guangzhou', label: '廣州', tz: 'Asia/Shanghai', lng: 113.26, lat: 23.13, region: 'cn' },
  { key: 'taipei', label: '台北', tz: 'Asia/Taipei', lng: 121.57, lat: 25.03, region: 'gat' },
  { key: 'singapore', label: '新加坡', tz: 'Asia/Singapore', lng: 103.82, lat: 1.35, region: 'sea' },
  { key: 'london', label: '倫敦', tz: 'Europe/London', lng: -0.13, lat: 51.51, region: 'eu' },
  { key: 'newYork', label: '紐約', tz: 'America/New_York', lng: -74.01, lat: 40.71, region: 'na' },
  /* ── 2026-10-13 加（讀者 feedback：地方太少）。⚠ 只可以喺尾加：草稿用位置號（placeIndex）記住揀咗邊個 ── */
  { key: 'macau', label: '澳門', tz: 'Asia/Macau', lng: 113.54, lat: 22.19, region: 'gat' },
  { key: 'taoyuan', label: '桃園', tz: 'Asia/Taipei', lng: 121.3, lat: 24.99, region: 'gat' },
  { key: 'taichung', label: '台中', tz: 'Asia/Taipei', lng: 120.68, lat: 24.14, region: 'gat' },
  { key: 'tainan', label: '台南', tz: 'Asia/Taipei', lng: 120.21, lat: 22.99, region: 'gat' },
  { key: 'kaohsiung', label: '高雄', tz: 'Asia/Taipei', lng: 120.3, lat: 22.63, region: 'gat' },
  { key: 'beijing', label: '北京', tz: 'Asia/Shanghai', lng: 116.4, lat: 39.9, region: 'cn' },
  { key: 'shanghai', label: '上海', tz: 'Asia/Shanghai', lng: 121.47, lat: 31.23, region: 'cn' },
  { key: 'shenzhen', label: '深圳', tz: 'Asia/Shanghai', lng: 114.06, lat: 22.54, region: 'cn' },
  { key: 'dongguan', label: '東莞', tz: 'Asia/Shanghai', lng: 113.75, lat: 23.02, region: 'cn' },
  { key: 'foshan', label: '佛山', tz: 'Asia/Shanghai', lng: 113.12, lat: 23.02, region: 'cn' },
  { key: 'zhuhai', label: '珠海', tz: 'Asia/Shanghai', lng: 113.58, lat: 22.27, region: 'cn' },
  { key: 'zhongshan', label: '中山', tz: 'Asia/Shanghai', lng: 113.39, lat: 22.52, region: 'cn' },
  { key: 'jiangmen', label: '江門', tz: 'Asia/Shanghai', lng: 113.08, lat: 22.58, region: 'cn' },
  { key: 'shantou', label: '汕頭', tz: 'Asia/Shanghai', lng: 116.68, lat: 23.35, region: 'cn' },
  { key: 'chaozhou', label: '潮州', tz: 'Asia/Shanghai', lng: 116.62, lat: 23.66, region: 'cn' },
  { key: 'meizhou', label: '梅州', tz: 'Asia/Shanghai', lng: 116.12, lat: 24.29, region: 'cn' },
  { key: 'zhanjiang', label: '湛江', tz: 'Asia/Shanghai', lng: 110.36, lat: 21.27, region: 'cn' },
  { key: 'tianjin', label: '天津', tz: 'Asia/Shanghai', lng: 117.2, lat: 39.08, region: 'cn' },
  { key: 'chongqing', label: '重慶', tz: 'Asia/Shanghai', lng: 106.55, lat: 29.56, region: 'cn' },
  { key: 'chengdu', label: '成都', tz: 'Asia/Shanghai', lng: 104.07, lat: 30.57, region: 'cn' },
  { key: 'wuhan', label: '武漢', tz: 'Asia/Shanghai', lng: 114.31, lat: 30.59, region: 'cn' },
  { key: 'nanjing', label: '南京', tz: 'Asia/Shanghai', lng: 118.8, lat: 32.06, region: 'cn' },
  { key: 'hangzhou', label: '杭州', tz: 'Asia/Shanghai', lng: 120.16, lat: 30.27, region: 'cn' },
  { key: 'suzhou', label: '蘇州', tz: 'Asia/Shanghai', lng: 120.62, lat: 31.3, region: 'cn' },
  { key: 'ningbo', label: '寧波', tz: 'Asia/Shanghai', lng: 121.55, lat: 29.87, region: 'cn' },
  { key: 'wenzhou', label: '溫州', tz: 'Asia/Shanghai', lng: 120.7, lat: 28.0, region: 'cn' },
  { key: 'xiamen', label: '廈門', tz: 'Asia/Shanghai', lng: 118.09, lat: 24.48, region: 'cn' },
  { key: 'fuzhou', label: '福州', tz: 'Asia/Shanghai', lng: 119.3, lat: 26.07, region: 'cn' },
  { key: 'quanzhou', label: '泉州', tz: 'Asia/Shanghai', lng: 118.68, lat: 24.87, region: 'cn' },
  { key: 'changsha', label: '長沙', tz: 'Asia/Shanghai', lng: 112.94, lat: 28.23, region: 'cn' },
  { key: 'nanchang', label: '南昌', tz: 'Asia/Shanghai', lng: 115.86, lat: 28.68, region: 'cn' },
  { key: 'hefei', label: '合肥', tz: 'Asia/Shanghai', lng: 117.23, lat: 31.82, region: 'cn' },
  { key: 'zhengzhou', label: '鄭州', tz: 'Asia/Shanghai', lng: 113.63, lat: 34.75, region: 'cn' },
  { key: 'jinan', label: '濟南', tz: 'Asia/Shanghai', lng: 117.12, lat: 36.65, region: 'cn' },
  { key: 'qingdao', label: '青島', tz: 'Asia/Shanghai', lng: 120.38, lat: 36.07, region: 'cn' },
  { key: 'shijiazhuang', label: '石家莊', tz: 'Asia/Shanghai', lng: 114.51, lat: 38.04, region: 'cn' },
  { key: 'taiyuan', label: '太原', tz: 'Asia/Shanghai', lng: 112.55, lat: 37.87, region: 'cn' },
  { key: 'xian', label: '西安', tz: 'Asia/Shanghai', lng: 108.94, lat: 34.34, region: 'cn' },
  { key: 'lanzhou', label: '蘭州', tz: 'Asia/Shanghai', lng: 103.83, lat: 36.06, region: 'cn' },
  { key: 'xining', label: '西寧', tz: 'Asia/Shanghai', lng: 101.78, lat: 36.62, region: 'cn' },
  { key: 'yinchuan', label: '銀川', tz: 'Asia/Shanghai', lng: 106.23, lat: 38.49, region: 'cn' },
  { key: 'urumqi', label: '烏魯木齊', tz: 'Asia/Shanghai', lng: 87.62, lat: 43.83, region: 'cn' },
  { key: 'lhasa', label: '拉薩', tz: 'Asia/Shanghai', lng: 91.14, lat: 29.65, region: 'cn' },
  { key: 'hohhot', label: '呼和浩特', tz: 'Asia/Shanghai', lng: 111.75, lat: 40.84, region: 'cn' },
  { key: 'shenyang', label: '瀋陽', tz: 'Asia/Shanghai', lng: 123.43, lat: 41.81, region: 'cn' },
  { key: 'dalian', label: '大連', tz: 'Asia/Shanghai', lng: 121.61, lat: 38.91, region: 'cn' },
  { key: 'changchun', label: '長春', tz: 'Asia/Shanghai', lng: 125.32, lat: 43.82, region: 'cn' },
  { key: 'harbin', label: '哈爾濱', tz: 'Asia/Shanghai', lng: 126.53, lat: 45.8, region: 'cn' },
  { key: 'nanning', label: '南寧', tz: 'Asia/Shanghai', lng: 108.37, lat: 22.82, region: 'cn' },
  { key: 'guilin', label: '桂林', tz: 'Asia/Shanghai', lng: 110.29, lat: 25.27, region: 'cn' },
  { key: 'haikou', label: '海口', tz: 'Asia/Shanghai', lng: 110.2, lat: 20.04, region: 'cn' },
  { key: 'sanya', label: '三亞', tz: 'Asia/Shanghai', lng: 109.51, lat: 18.25, region: 'cn' },
  { key: 'kunming', label: '昆明', tz: 'Asia/Shanghai', lng: 102.83, lat: 24.88, region: 'cn' },
  { key: 'guiyang', label: '貴陽', tz: 'Asia/Shanghai', lng: 106.63, lat: 26.65, region: 'cn' },
  { key: 'kualaLumpur', label: '吉隆坡', tz: 'Asia/Kuala_Lumpur', lng: 101.69, lat: 3.14, region: 'sea' },
  { key: 'penang', label: '檳城', tz: 'Asia/Kuala_Lumpur', lng: 100.33, lat: 5.41, region: 'sea' },
  { key: 'ipoh', label: '怡保', tz: 'Asia/Kuala_Lumpur', lng: 101.08, lat: 4.6, region: 'sea' },
  { key: 'johorBahru', label: '新山', tz: 'Asia/Kuala_Lumpur', lng: 103.76, lat: 1.49, region: 'sea' },
  { key: 'malacca', label: '馬六甲', tz: 'Asia/Kuala_Lumpur', lng: 102.25, lat: 2.19, region: 'sea' },
  { key: 'kuching', label: '古晉', tz: 'Asia/Kuching', lng: 110.35, lat: 1.55, region: 'sea' },
  { key: 'sibu', label: '詩巫', tz: 'Asia/Kuching', lng: 111.82, lat: 2.29, region: 'sea' },
  { key: 'kotaKinabalu', label: '亞庇', tz: 'Asia/Kuching', lng: 116.07, lat: 5.98, region: 'sea' },
  { key: 'bangkok', label: '曼谷', tz: 'Asia/Bangkok', lng: 100.5, lat: 13.76, region: 'sea' },
  { key: 'chiangMai', label: '清邁', tz: 'Asia/Bangkok', lng: 98.99, lat: 18.79, region: 'sea' },
  { key: 'jakarta', label: '雅加達', tz: 'Asia/Jakarta', lng: 106.85, lat: -6.21, region: 'sea' },
  { key: 'surabaya', label: '泗水', tz: 'Asia/Jakarta', lng: 112.75, lat: -7.25, region: 'sea' },
  { key: 'medan', label: '棉蘭', tz: 'Asia/Jakarta', lng: 98.67, lat: 3.6, region: 'sea' },
  { key: 'pontianak', label: '坤甸', tz: 'Asia/Pontianak', lng: 109.33, lat: -0.03, region: 'sea' },
  { key: 'manila', label: '馬尼拉', tz: 'Asia/Manila', lng: 120.98, lat: 14.6, region: 'sea' },
  { key: 'cebu', label: '宿霧', tz: 'Asia/Manila', lng: 123.89, lat: 10.32, region: 'sea' },
  { key: 'hoChiMinh', label: '胡志明市', tz: 'Asia/Ho_Chi_Minh', lng: 106.7, lat: 10.78, region: 'sea' },
  { key: 'hanoi', label: '河內', tz: 'Asia/Ho_Chi_Minh', lng: 105.85, lat: 21.03, region: 'sea' },
  { key: 'phnomPenh', label: '金邊', tz: 'Asia/Phnom_Penh', lng: 104.92, lat: 11.56, region: 'sea' },
  { key: 'vientiane', label: '永珍', tz: 'Asia/Vientiane', lng: 102.63, lat: 17.97, region: 'sea' },
  { key: 'yangon', label: '仰光', tz: 'Asia/Yangon', lng: 96.2, lat: 16.87, region: 'sea' },
  { key: 'bandarSeriBegawan', label: '斯里巴加灣', tz: 'Asia/Brunei', lng: 114.94, lat: 4.9, region: 'sea' },
  { key: 'tokyo', label: '東京', tz: 'Asia/Tokyo', lng: 139.69, lat: 35.69, region: 'asia' },
  { key: 'osaka', label: '大阪', tz: 'Asia/Tokyo', lng: 135.5, lat: 34.69, region: 'asia' },
  { key: 'seoul', label: '首爾', tz: 'Asia/Seoul', lng: 126.98, lat: 37.57, region: 'asia' },
  { key: 'manchester', label: '曼徹斯特', tz: 'Europe/London', lng: -2.24, lat: 53.48, region: 'eu' },
  { key: 'birmingham', label: '伯明翰', tz: 'Europe/London', lng: -1.9, lat: 52.49, region: 'eu' },
  { key: 'edinburgh', label: '愛丁堡', tz: 'Europe/London', lng: -3.19, lat: 55.95, region: 'eu' },
  { key: 'paris', label: '巴黎', tz: 'Europe/Paris', lng: 2.35, lat: 48.86, region: 'eu' },
  { key: 'amsterdam', label: '阿姆斯特丹', tz: 'Europe/Amsterdam', lng: 4.9, lat: 52.37, region: 'eu' },
  { key: 'sanFrancisco', label: '三藩市', tz: 'America/Los_Angeles', lng: -122.42, lat: 37.77, region: 'na' },
  { key: 'losAngeles', label: '洛杉磯', tz: 'America/Los_Angeles', lng: -118.24, lat: 34.05, region: 'na' },
  { key: 'vancouver', label: '溫哥華', tz: 'America/Vancouver', lng: -123.12, lat: 49.28, region: 'na' },
  { key: 'toronto', label: '多倫多', tz: 'America/Toronto', lng: -79.38, lat: 43.65, region: 'na' },
  { key: 'sydney', label: '悉尼', tz: 'Australia/Sydney', lng: 151.21, lat: -33.87, region: 'oc' },
  { key: 'melbourne', label: '墨爾本', tz: 'Australia/Melbourne', lng: 144.96, lat: -37.81, region: 'oc' },
  { key: 'brisbane', label: '布里斯本', tz: 'Australia/Brisbane', lng: 153.03, lat: -27.47, region: 'oc' },
  { key: 'perth', label: '珀斯', tz: 'Australia/Perth', lng: 115.86, lat: -31.95, region: 'oc' },
  { key: 'auckland', label: '奧克蘭', tz: 'Pacific/Auckland', lng: 174.76, lat: -36.85, region: 'oc' },
] as const satisfies readonly { key: string; label: string; tz: string; lng: number; lat: number; region: PlaceRegion }[];

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
