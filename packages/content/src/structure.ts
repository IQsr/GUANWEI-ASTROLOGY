/**
 * L3 結構層（工單 C7）
 *
 * 出處：內容系統 §3、docs/voice-spec.md §13、§16
 *
 * 結構層答嘅唔係「係咩」，係「呢個方向有冇嘢撐住、有冇嘢頂住」。
 * 規範 §13 把三方四正列做**結構驗證權重 2**：「確認支持與制約」，
 * 並且明文禁止「把同一組星從不同角度重複計票」。
 *
 * ── 點解呢層係 C6 之後嘅樽頸 ──
 *
 * §16 門檻二要「至少兩群來自不同時間層的核心」，
 * 門檻四畀本命篇章一條路：**兩個本命核心群 ＋ 一個結構驗證群**。
 *
 * C6 做完之後，career 有四個群、兩個核心，但**結構驗證群係零** ——
 * 因為三方四正規則之前淨係得命宮嗰條。所以 career 卡喺順／慎。
 * 呢個檔案就係補返嗰一格：十二個宮各自嘅三方四正。
 */
import gejuDoc from './rules/geju.json';
import type { Topic } from './rule';

const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'] as const;

const TOPIC: Record<string, Topic> = {
  命宮: 'self', 兄弟: 'social', 夫妻: 'relationship', 子女: 'self',
  財帛: 'finance', 疾厄: 'load', 遷移: 'self', 僕役: 'social',
  官祿: 'career', 田宅: 'home', 福德: 'load', 父母: 'self',
};

const ENGINE_SRC = [
  { book: '觀微 排盤引擎 v0.1', ref: '§5 安宮與三方四正' },
  { book: 'docs/rules.md', ref: 'B14 三方四正與空宮借星' },
];

/**
 * 三方四正：十二宮各一對（煞／吉）。
 *
 * 角色係 `structural` —— 佢確認支持同制約，**唔提供方向**。
 * 每個宮自己一個去重群：官祿嘅三方四正同財帛嘅三方四正係唔同嘅幾何關係，
 * 唔係同一件事講兩次。但同一個宮嘅煞同吉共用一群 ——
 * 因為佢哋數緊同一組星（§13：唔准把同一組星從不同角度重複計票）。
 */
export function sanFangRules(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const palace of PALACES) {
    for (const [key, cls, xiang, forbid] of [
      ['pressure', 'malefic', ['結構上有多重制約', '條件較多'], ['煞多必凶', '由煞數直接評級']],
      ['support', 'benefic', ['結構上有多重支持', '條件較配合'], ['吉多必吉', '由吉數直接評級']],
    ] as const) {
      out.push({
        rule_id: `sanfang.${palace}-${key}.structural`,
        version: '1.0',
        schools: ['zhongzhou-v1'],
        requires: ['natal'],
        role: 'structural',
        independence_group: `sanfang.${palace}`,
        trigger: { sanfangOf: { name: palace }, count: cls, op: 'gte', n: 3 },
        exclude: null,
        allowed_xiang: [...xiang],
        prohibited_inferences: [...forbid, '把同一組星從不同角度重複計票'],
        topics: [TOPIC[palace]],
        depends_on: [],
        review_status: 'approved',
        review_reasons: ['純幾何 —— 三方四正係算出嚟嘅關係，唔係流派主張'],
        sources: ENGINE_SRC,
        note: '結構驗證只確認支持同制約，唔提供方向（§13）。',
      });
    }
  }
  return out;
}

/**
 * 空宮借星：十二宮各一條。
 *
 * 命書一定要明寫「此宮無主星，借對宮○○參看」（內容系統 §6）——
 * 空宮本身就係訊息，照實講反而可信。
 */
export function emptyPalaceRules(): Record<string, unknown>[] {
  return PALACES.map((palace) => ({
    rule_id: `structure.empty.${palace}`,
    version: '1.0',
    schools: ['zhongzhou-v1'],
    requires: ['natal'],
    role: 'structural',
    independence_group: `structure.empty.${palace}`,
    trigger: { empty: { name: palace } },
    exclude: null,
    allowed_xiang: ['本宮無主星，借對宮參看', '特質須連對宮一併讀'],
    prohibited_inferences: ['空宮必弱', '空宮等於這一塊不好'],
    topics: [TOPIC[palace]],
    depends_on: [],
    review_status: 'approved',
    review_reasons: ['純結構 —— 空宮判定同借對宮係引擎算出嚟嘅'],
    sources: ENGINE_SRC,
    note: '命書一定要明寫借咗邊個宮（內容系統 §6）。',
  }));
}

/**
 * 命身關係：身宮落喺邊一宮。
 *
 * 身宮只可能落命、夫妻、財帛、遷移、官祿、福德六宮之一 ——
 * 呢個唔係規定，係安身命嘅算式推出嚟嘅（引擎不變量 05）。
 * 所以呢度剛好六條，唔會多一條。
 */
const SHEN_PALACES = ['命宮', '夫妻', '財帛', '遷移', '官祿', '福德'] as const;

export function shenGongRules(): Record<string, unknown>[] {
  const XIANG: Record<string, string[]> = {
    命宮: ['先天與後天著力點一致', '基調清楚'],
    夫妻: ['心力放喺關係上', '關係影響基調'],
    財帛: ['心力放喺資源上', '以務實為著力點'],
    遷移: ['心力放喺外部', '在外用力多過在家'],
    官祿: ['心力放喺做事上', '以成果為著力點'],
    福德: ['心力放喺內在', '以安頓為著力點'],
  };
  return SHEN_PALACES.map((palace) => ({
    rule_id: `structure.shen.${palace}`,
    version: '1.0',
    schools: ['zhongzhou-v1'],
    requires: ['natal'],
    role: 'structural',
    // 身宮只有一個位置，所以六條至多中一條，共用一群
    independence_group: 'structure.shen',
    trigger: { shenIn: { name: palace } },
    exclude: null,
    allowed_xiang: XIANG[palace]!,
    prohibited_inferences: ['身宮落某宮就等於某件事會發生', '把著力點讀成成就'],
    topics: [TOPIC[palace]],
    depends_on: [],
    review_status: 'approved',
    review_reasons: ['身宮落位由算式決定，六個可能位置係不變量 05 推出嚟'],
    sources: ENGINE_SRC,
    note: '《全書》：「命宮定基調，身宮看你把力氣花在哪裡。」',
  }));
}

/* ──────────────────────────────────────────────
   格局
   ────────────────────────────────────────────── */

export type Geju = {
  id: string;
  name: string;
  trigger: unknown;
  allowed_xiang: string[];
  prohibited_inferences: string[];
  topics: Topic[];
  status: 'approved' | 'needs_review' | 'rejected';
  sources: { corpus: string; passage_id: string; quote: string; scope: string }[];
  note: string;
};

export const GEJU: Geju[] = (gejuDoc as unknown as { geju: Geju[] }).geju;

/**
 * ⚠ **永久拒絕嗰九個格局。**
 *
 * 呢個係 C7 做落去先至清楚嘅一件事。
 *
 * 《全書》太微賦入面有一批凶格，而佢哋被記錄低嘅**唯一**象義，
 * 就係規範 §19 硬閘禁止嘅推斷：路上埋屍、水中作塚、必定死亡、
 * 須當刑戮、枷杻難逃、離鄉遭配、沿途乞食、終身鼠竊、天年夭似顏回。
 *
 * 呢啲唔係「證據唔夠所以暫時唔寫」—— 係任何證據都解鎖唔到。
 * 所以佢哋嘅狀態係 `rejected`，唔係 `needs_review`：
 * **人手覆核都唔會令佢哋變成可發布。**
 *
 * 咁點解仲要留低佢哋嘅觸發條件？
 * 因為唔留低，下一個人睇返太微賦就會「重新發現」呢個格局，
 * 然後當成一件新嘢寫出嚟。留低，就係留低一個已經判過嘅決定。
 */
export function rejectedGeju(): Geju[] {
  return GEJU.filter((g) => g.status === 'rejected');
}

export function gejuRules(): Record<string, unknown>[] {
  return GEJU.filter((g) => g.status !== 'rejected').map((g) => ({
    rule_id: `geju.${g.id}.core`,
    version: '1.0',
    schools: ['zhongzhou-v1'],
    requires: ['natal'],
    role: 'core',
    independence_group: `geju.${g.id}`,
    trigger: g.trigger,
    exclude: null,
    allowed_xiang: g.allowed_xiang.length ? g.allowed_xiang : ['（無容許象義）'],
    prohibited_inferences: g.prohibited_inferences,
    topics: g.topics,
    depends_on: [],
    review_status: g.status,
    review_reasons: [g.note || `格局 ${g.name}`],
    // 兩個來源係兩件唔同嘅嘢：觸發條件係幾何（引擎），象義先係賦文
    sources: [
      ...g.sources.map((s) => ({ book: '紫微斗數全書', ref: `${s.passage_id}（${s.scope}）` })),
      { book: '觀微 排盤引擎 v0.1', ref: '§5 安宮與三方四正（觸發條件係幾何）' },
    ],
    note: `格局 ${g.name}。容許象義係詞義範圍，唔係吉凶對照。`,
  }));
}
