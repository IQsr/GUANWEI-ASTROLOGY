/**
 * L3 結構層正文實例（工單 C8b）
 */
import type { Chart, Palace, PalaceName } from '@guanwei/ziwei';
import raw from './l3/blocks.json';
import { buildL3, mostSimilarL3, type L3Block } from './l3';

export const L3_BLOCKS: L3Block[] = buildL3(raw as unknown[]);

export const l3Similar = (top = 5) => mostSimilarL3(L3_BLOCKS, top);

export function l3Coverage() {
  const by = (k: L3Block['kind']) => L3_BLOCKS.filter((b) => b.kind === k).length;
  return {
    relation: by('relation'), sanfang: by('sanfang'), shen: by('shen'),
    geju: by('geju'), empty: by('empty'), total: L3_BLOCKS.length,
  };
}

/**
 * 揀呢一宮嘅牽動塊。
 *
 * ── 一塊永遠有，一塊睇盤 ──
 *
 * 第一塊一定係 `relation`：呢個宮嘅三方四正連住邊幾個宮。
 * 佢係幾何，逐副盤都一樣，所以永遠揀得到 ——
 * 而「牽動」係 §6 插槽表入面嘅**必需**格，一個必需格唔應該有時有有時冇。
 *
 * ⚠ 呢個唔係為咗填滿個版。C8b 第一次跑嘅時候，
 * 兄弟、福德、交友、疾厄四個宮嘅牽動格係空嘅 —— 因為嗰四個宮
 * 三方四正冇集中、冇格局、唔係身宮。但「呢一宮連住邊幾個宮」呢件事
 * **一直都喺度**，只係我哋原本冇寫。空咗嘅唔係盤，係我哋嘅內容。
 *
 * 第二塊先至睇盤：三方四正（呢個宮自己嘅結構）行先，格局跟住，
 * 身宮同空宮最後 —— 前者最貼呢一章，後者最容易喧賓奪主。
 * 而且第二塊**只揀命中咗規則**嗰啲：一塊冇規則撐住嘅正文，就係即席創作。
 */
export function l3For(
  palace: PalaceName,
  _p: Palace,
  _chart: Chart,
  matchedRuleIds: Set<string>,
): L3Block[] {
  const pick: L3Block[] = [];
  const rel = L3_BLOCKS.find((b) => b.kind === 'relation' && b.key === palace);
  if (rel) pick.push(rel);

  const fires = (b: L3Block) => b.rule_ids.some((id) => matchedRuleIds.has(id));

  /*
   * ⚠ `shen` 唔喺呢個 order 入面（工單 C12b · Issac 2026-09-20 揀咗甲案）。
   *
   * 身宮有咗自己一章（免費章「身宮與五行局」），而六條 `l3.shen.*` 塊
   * 唔可以兩邊都用 —— 一件事喺同一本書講兩次係個 bug。
   *
   * 代價：身宮所在嗰一宮，呢一格薄咗一塊。`relation` 永遠揀得到，
   * 所以個必需格唔會空，但佢真係少咗一層。
   *
   * 乙案（新章寫新材料）留返畀三方四正同性格骨架 —— 嗰兩章要新嘅 L3 塊，
   * 而新塊要有來源，即係要書（B5）。
   */
  const order: L3Block['kind'][] = ['sanfang', 'geju', 'empty'];
  for (const kind of order) {
    for (const b of L3_BLOCKS) {
      if (b.kind !== kind) continue;
      if (kind !== 'geju' && b.key !== palace) continue;
      if (!fires(b)) continue;
      pick.push(b);
      return pick;
    }
  }
  return pick;
}
