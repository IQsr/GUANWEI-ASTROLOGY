/**
 * 流派設定（工單 B13）
 *
 * 出處：docs/voice-spec.md §10 輸入與流派鎖定、§17 置信度與證據欄位
 *
 * 規範要求每個 interpretation object 填 `school_profile_id` 同
 * `rule_registry_version`，而且**唔准留空、唔准用未鎖定嘅 latest**。
 * 呢個檔案就係嗰個 id 嘅來源。
 *
 * 兩件事要分清楚，呢份設定亦都分開咗兩個欄位講：
 *
 *   disabled          —— 三合派**唔用**。係選擇，唔係缺陷。
 *                        （自化、飛化、向心／離心係四化派／飛星派嘅核心）
 *   not-implemented   —— 我哋**未做**。係缺陷，記住要補。
 *                        （B15 做完之後淨返流曜、小限、流月流日）
 *
 * 唔分開兩者，個規則庫就會永遠帶住一堆意思含糊嘅「冇」。
 */
import brightnessDoc from './rules/brightness.json';
import sihuaDoc from './rules/sihua.json';
import { DEFAULT_RULES } from './rules';
import { TABLES_CHECKSUM } from './calendar/tables';

/** 一個功能喺呢個流派入面嘅狀態。 */
export type FeatureState =
  /** 呢個流派用，而且引擎做咗。 */
  | 'enabled'
  /** 呢個流派唔用。規範 §10：特殊規則只可以喺已登記嘅流派設定啟用。 */
  | 'disabled'
  /** 呢個流派用，但引擎未做。⚠ 係缺口。 */
  | 'not-implemented';

export type SchoolProfile = {
  /** 人手維護嘅版本。改咗任何規則就要 bump。 */
  id: string;
  name: string;
  lineage: string;
  /**
   * 流派聲明 —— 讀者見到嘅嗰句。
   *
   * `/about`、每本命書嘅版權頁、命書四化章，三處用同一句，
   * 而且有測試核佢同 `sihua.json` 對唔對得上（docs/rules.md R-003）。
   * 聲明同資料各講各話，就係我哋批評緊人哋嗰件事。
   *
   * 刻意唔入 fingerprint：佢係描述，唔係規則。
   * 規則一改 fingerprint 就會爆，而一致性由測試守。
   */
  declaration: string;
  /** 完整 id：`<id>@<fingerprint>`。填落 interpretation object 嗰個。 */
  ref: string;
  /** 由下面所有欄位算出嚟。任何一樣變咗，佢就變。 */
  fingerprint: string;
  engineVersion: string;
  tablesChecksum: string;
  /** docs/rules.md 嘅 R-xxx。每條嘅完整理由、出處、核實狀態喺嗰度。 */
  rules: typeof DEFAULT_RULES & { registry: readonly string[] };
  sihua: { set: string; school: string; disputedStems: readonly string[] };
  brightness: { verification: string; school: string };
  features: Readonly<Record<string, FeatureState>>;
  /** 唔可以啟用嘅推斷。規範 §19 嘅硬閘，喺流派層面就寫死。 */
  prohibited: readonly string[];
};

/**
 * 純 JS 變更偵測器。
 *
 * **唔係密碼學 checksum** —— 佢嘅工作係「有嘢改咗嗰陣一定會變」，
 * 唔係防篡改。引擎要喺瀏覽器行，所以唔用 node:crypto。
 * （萬年曆嗰個 TABLES_CHECKSUM 先係真 sha256，離線算完 commit 入嚟。）
 *
 * 兩次唔同 offset 嘅 FNV-1a，砌成 16 個 hex 字。
 */
function fingerprint(s: string): string {
  const pass = (offset: number): string => {
    let h = offset >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return pass(0x811c9dc5) + pass(0x9e3779b9);
}

const RULE_REGISTRY = [
  'R-001 年界：正月初一',
  'R-002 晚子時：算翌日',
  'R-003 庚干四化：中州派 陽武府同',
  'R-004 日期基準：出生地當地日',
  'R-005 節界：精確交節時刻',
  'R-006 閏月：上半月本月、下半月下月',
  'R-007 歷史夏令時：認',
] as const;

const FEATURES: Record<string, FeatureState> = {
  /* ── 三合派用，引擎做咗 ── */
  本命盤: 'enabled',
  大限: 'enabled',
  生年四化: 'enabled',
  廟旺利陷: 'enabled',
  六吉六煞: 'enabled',
  三方四正: 'enabled',
  空宮借星: 'enabled',
  /* 工單 B15 做咗 —— 年度章嘅證據來源 */
  流年: 'enabled',
  流年四化: 'enabled',
  大限四化: 'enabled',
  限流疊宮: 'enabled',

  /* ── 三合派唔用。係選擇，唔係缺陷。 ── */
  自化: 'disabled',
  飛化: 'disabled',
  向心離心: 'disabled',

  /* ── 三合派用，但引擎未做。⚠ 缺口。 ── */
  流曜: 'not-implemented',
  小限: 'not-implemented',
  流月流日: 'not-implemented',
};

/**
 * 規範 §19 嘅事件禁則，喺流派層面就寫死。
 *
 * 「即使本命、大限、流年完全同向，也不得推斷」——
 * 即係話呢啲唔係「證據唔夠」嘅問題，係任何證據都解鎖唔到。
 */
const PROHIBITED = [
  '死亡與壽命',
  '疾病與器官病變',
  '意外與事故',
  '生育結果',
  '犯罪與訴訟結果',
  '外遇與第三方忠誠',
  '婚姻必然破裂',
  '事件概率百分比',
  '重大決策指令（投資、停藥、離婚、辭職）',
] as const;

/**
 * 流派聲明。改呢句之前先睇 docs/rules.md R-003 嗰條原則：
 *
 *   喺公認嘅分歧點上表態；喺冇人當佢係分歧點嘅地方跟大隊。
 *
 * 「公認」有判準：引得出一個具名來源當佢係爭論。
 * 庚干引得出（王亭之〈庚干四化的爭論〉），壬干引唔出。
 */
const DECLARATION =
  '體系依三合派 · 中州派（王亭之系統）。四化表以通行本為底；' +
  '庚干採中州派「陽武府同」（太陽化祿、武曲化權、天府化科、天同化忌），其餘版本並列。';

const CORE = {
  lineage: '三合派 · 中州派（王亭之系統）',
  rules: DEFAULT_RULES,
  registry: RULE_REGISTRY,
  sihuaSchool: (sihuaDoc as { school: string }).school,
  sihuaDisputed: Object.keys((sihuaDoc as { disputed?: Record<string, unknown> }).disputed ?? {}),
  brightnessVerification: (brightnessDoc as { verification: string }).verification,
  brightnessSchool: (brightnessDoc as { school: string }).school,
  features: FEATURES,
  prohibited: PROHIBITED,
  tablesChecksum: TABLES_CHECKSUM,
};

/** 用 sort 過嘅 key 序列化，等 JS 物件次序改咗都唔會令 fingerprint 無端變。 */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${k}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/**
 * 建一個流派設定。
 *
 * `engineVersion` 由 index.ts 傳入，唔喺呢度 import ——
 * 避免 circular import，亦都令 fingerprint 明確包含引擎版本。
 */
export function buildSchoolProfile(id: string, engineVersion: string): SchoolProfile {
  const payload = canonical({ id, engineVersion, ...CORE });
  const fp = fingerprint(payload);
  return {
    id,
    name: '觀微 · 中州派',
    lineage: CORE.lineage,
    declaration: DECLARATION,
    ref: `${id}@${fp}`,
    fingerprint: fp,
    engineVersion,
    tablesChecksum: CORE.tablesChecksum,
    rules: { ...DEFAULT_RULES, registry: RULE_REGISTRY },
    sihua: {
      set: DEFAULT_RULES.sihuaSet,
      school: CORE.sihuaSchool,
      disputedStems: CORE.sihuaDisputed,
    },
    brightness: {
      verification: CORE.brightnessVerification,
      school: CORE.brightnessSchool,
    },
    features: FEATURES,
    prohibited: PROHIBITED,
  };
}

/** 引擎未做、但呢個流派要用嘅嘢。空 array 之前，年度章寫唔到。 */
export function missingFeatures(p: SchoolProfile): string[] {
  return Object.entries(p.features)
    .filter(([, s]) => s === 'not-implemented')
    .map(([k]) => k);
}
