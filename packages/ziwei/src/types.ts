/**
 * 觀微排盤引擎 — 對外契約
 *
 * 呢個檔案係「引擎 v0.1」第七節嘅 API 契約。入面點實作都得，
 * 但呢個形狀唔准隨便變 —— 網站、測試、快取全部食呢個。
 *
 * 設計原則（引擎 plan §7）：
 *   1. 純函數：冇 I/O、冇 new Date()、冇隱含時區
 *   2. 錯誤用 result type，唔用 throw
 *   3. meta.rules 要跟住 chart 一齊存落 DB
 *
 * ⚠ 呢個檔亦都係 `@guanwei/ziwei/contract` —— 畀 UI 用嗰個入口（E4）。
 *
 * 佢**一個 import 都冇**，所以 import 佢唔會拖埋任何嘢落嚟。
 * 而 `@guanwei/ziwei`（總入口）唔同：佢喺 module 頂層計 `SCHOOL_PROFILE`，
 * 而嗰個計算要讀萬年曆表 —— 即係話**由總入口攞一個常數，
 * 等於 import 成個引擎**，tree-shaking 救唔到。
 *
 * E4 就係咁樣發現 60KB 引擎點解一直留喺 client bundle：
 * `Chart.tsx` 為咗攞十二地支，寫咗 `import { BRANCHES } from '@guanwei/ziwei'`。
 *
 * 所以：**UI 只可以 import 呢個入口。** 總入口留畀 server。
 */

/** 十二地支，由子起。索引 0–11。 */
export const BRANCHES = [
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
] as const;
export type Branch = (typeof BRANCHES)[number];

/** 十天干。 */
export const STEMS = [
  '甲', '乙', '丙', '丁', '戊',
  '己', '庚', '辛', '壬', '癸',
] as const;
export type Stem = (typeof STEMS)[number];

/** 十二宮名，由命宮起，逆行。 */
export const PALACE_NAMES = [
  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄',
  '遷移', '僕役', '官祿', '田宅', '福德', '父母',
] as const;
export type PalaceName = (typeof PALACE_NAMES)[number];

/** 五行局。n 同時係大限起運歲數。 */
export type WuxingJu =
  | { name: '水二局'; n: 2 }
  | { name: '木三局'; n: 3 }
  | { name: '金四局'; n: 4 }
  | { name: '土五局'; n: 5 }
  | { name: '火六局'; n: 6 };

/** 時辰索引：0 = 子時，11 = 亥時。 */
export type ShichenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * 廟旺利陷，由強到弱**七檔**。
 *
 * 留意係七檔唔係六檔：「不」（不得地）夾喺「平」同「陷」之間。
 * 部分流派只用五或六檔 —— 見 src/rules/brightness.json。
 */
export type Brightness = '廟' | '旺' | '得' | '利' | '平' | '不' | '陷';

/** 四化。 */
export type Sihua = '祿' | '權' | '科' | '忌';

/**
 * 流派選項。三個分歧點喺 docs/rules.md 有完整記錄；
 * 預設值就係嗰份文件揀定嘅答案。
 */
export type RuleOptions = {
  /** 真太陽時校正（經度 + 均時差）。預設開。 */
  trueSolarTime: boolean;
  /** 年干支換年嘅一刻。斗數傳統用農曆正月初一；八字用立春。 */
  yearBoundary: 'lunar-new-year' | 'lichun';
  /** 23:00–00:00 出生：算翌日早子時，定今日晚子時。 */
  lateZiHour: 'next-day' | 'same-day';
  /** 四化表。庚干化科各家不一，見 docs/rules.md。 */
  sihuaSet: 'zhongzhou' | 'quanshu';
};

export type BirthTime = { h: number; min: number } | { shichen: ShichenIndex };

export type BirthInput = {
  /** 國曆（西曆）。引擎內部自己轉農曆，唔好要用戶轉。 */
  solar: { y: number; m: number; d: number };
  /** 唔知時辰就用 castPartial()，唔好喺度亂填。 */
  time: BirthTime;
  /** IANA 時區，例如 "Asia/Hong_Kong"、"Europe/London"。 */
  tz: string;
  /** 出生地：經度用嚟做真太陽時校正。 */
  place: { lng: number; lat: number; label: string };
  /** 大限順逆由陰陽男女決定，冇佢排唔到大限。 */
  sex: 'male' | 'female';
  options?: Partial<RuleOptions>;
};

export type StarKind =
  /** 十四主星 */
  | 'major'
  /** 六吉、六煞、祿存、天馬 */
  | 'aux';

export type StarPlacement = {
  name: string;
  kind: StarKind;
  brightness?: Brightness;
  sihua?: Sihua;
};

export type Palace = {
  branch: Branch;
  stem: Stem;
  name: PalaceName;
  /** 呢個宮係咪身宮。 */
  isShen: boolean;
  stars: StarPlacement[];
  /**
   * 空宮（冇主星）借邊個宮參看。由 B14 填，只會係對宮。
   * 命書一定要明寫「此宮無主星，借對宮○○參看」——
   * 空宮本身就係訊息，照實講反而可信（內容系統 §6）。
   */
  borrowsFrom?: Branch;
};

export type Decadal = {
  /** 第幾個大限，1–12。 */
  index: number;
  branch: Branch;
  fromAge: number;
  toAge: number;
};

export type Chart = {
  meta: {
    engineVersion: string;
    /**
     * 流派設定 ref，形如 `zhongzhou-v1@<fingerprint>`。
     * 規範（docs/voice-spec.md §17）要求每個結論物件都填得到佢，
     * 而且唔准用未鎖定嘅 latest。見 src/school-profile.ts。
     */
    schoolProfile: string;
    rules: RuleOptions;
    /** 由呼叫者傳入，保持純函數。ISO 8601。 */
    computedAt?: string;
    tablesChecksum: string;
  };
  lunar: {
    y: number;
    m: number;
    d: number;
    isLeapMonth: boolean;
    shichen: ShichenIndex;
  };
  ganzhi: {
    year: [Stem, Branch];
    month: [Stem, Branch];
    day: [Stem, Branch];
    hour: [Stem, Branch];
  };
  wuxingJu: WuxingJu;
  mingGong: Branch;
  shenGong: Branch;
  palaces: Palace[];
  decadals: Decadal[];
};

/** 唔知時辰嘅部分結果：有年月日層資料，冇宮位。 */
export type PartialChart = Pick<Chart, 'meta' | 'lunar'> & {
  ganzhi: Omit<Chart['ganzhi'], 'hour'>;
};

export type CastErrorCode =
  /** 生辰超出萬年曆範圍（1900–2100）。 */
  | 'OUT_OF_RANGE'
  /** 冇時辰：要行 castPartial()。 */
  | 'UNKNOWN_HOUR'
  /** 出生地經緯度唔合法。 */
  | 'BAD_PLACE'
  /** 時區字串唔認得。 */
  | 'BAD_TIMEZONE'
  /** 模組未實作（骨架階段）。 */
  | 'NOT_IMPLEMENTED';

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; code: CastErrorCode; message: string };
export type Result<T> = Ok<T> | Err;
