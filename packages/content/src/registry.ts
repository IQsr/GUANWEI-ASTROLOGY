/**
 * 觀微規則庫實例（工單 C2）
 *
 * `RULE_REGISTRY.ref` 就係 §17 要求嘅 `rule_registry_version` ——
 * 帶住 fingerprint，所以任何一條規則改咗佢就變，而且唔會係 latest。
 */
import raw from './rules/registry.json';
import topicRaw from './rules/topic-map.json';
import { buildRegistry, type RuleRegistry, type Topic } from './rule';
import { BASE_BLOCKS } from './baseblock-data';
import { blocksToRules } from './baseblock';
import { MODIFIERS } from './modifier-data';
import { maleficRules, sihuaRules } from './modifier';
import { emptyPalaceRules, gejuRules, sanFangRules, shenGongRules } from './structure';

const DOC = raw as unknown as { registry_id: string; spec_version: string; rules: unknown[] };

/**
 * 規則庫 = 人手寫嘅結構規則 ＋ **由基塊派生嘅星宮規則**。
 *
 * 派生嗰批唔係另外寫一份 —— 佢哋由 C4／C5 嘅基塊算出嚟，
 * 所以基塊改咗規則即刻跟住改，冇得各講各話。
 */
export const RULE_REGISTRY: RuleRegistry = buildRegistry(DOC.registry_id, [
  ...DOC.rules,
  ...blocksToRules(BASE_BLOCKS),
  ...sihuaRules(),
  ...maleficRules(MODIFIERS),
  ...sanFangRules(),
  ...emptyPalaceRules(),
  ...shenGongRules(),
  ...gejuRules(),
]);
export const SPEC_VERSION = DOC.spec_version;

export type TopicEntry = {
  label: string;
  entry: string[];
  crosscheck: string[];
  prohibited: string[];
};

const TOPIC_DOC = topicRaw as unknown as {
  version: string;
  source: string;
  topics: Record<string, TopicEntry>;
};

/**
 * 主題 → 查閱入口（§12）。
 *
 * **呢個係查閱表，唔係判斷表。** 所以佢刻意唔喺規則庫入面 ——
 * 佢冇觸發條件、唔出 evidence、唔參與門檻。
 * 佢嘅工作係話你知「講職涯要睇邊幾個宮」同「邊啲嘢唔准由呢個宮推出嚟」。
 */
export function topicMap(topic: Topic): TopicEntry {
  const t = TOPIC_DOC.topics[topic];
  if (!t) throw new Error(`唔認得主題 ${topic}`);
  return t;
}

export const TOPIC_MAP_VERSION = TOPIC_DOC.version;

/** 一個主題喺呢個規則庫入面有幾多條**已審核**規則撐住。零 = 寫唔到嘢。 */
export function approvedRulesForTopic(topic: Topic) {
  return RULE_REGISTRY.approved.filter((r) => r.topics.includes(topic));
}

/** 未審核嘅規則 —— 睇得見嘅缺口。 */
export function pendingRules() {
  return RULE_REGISTRY.rules.filter((r) => r.review_status !== 'approved');
}
