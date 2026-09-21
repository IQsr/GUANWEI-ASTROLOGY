/**
 * 方向（工單 C8 第一半）
 *
 * 出處：docs/voice-spec.md §13、§14、§16、§18
 *
 * ── 一條規則點樣先算「講緊一個方向」 ──
 *
 * §16 成套機制建立喺「至少兩群**同向**證據」之上，所以證據要有方向。
 * 但 §14 同時明文寫住：「祿必富、權必升、科必考上、忌必凶」全部唔准推。
 *
 * 兩句加埋嘅意思唔係「方向唔存在」，而係**方向係一個主張，要有根據**。
 *
 * 所以呢度做咗一個決定：
 *
 *   **方向唔係一個人手標嘅欄位，係由規則自己已登記嘅 `allowed_xiang` 查返出嚟。**
 *
 * 分別喺邊？標欄位嘅講法係「我覺得呢條算順」；查象義嘅講法係
 * 「呢條規則登記咗嘅詞入面，有冇一個係講方向嘅」。後者答得出點解，前者答唔出。
 *
 * 後果係**大部分規則冇方向**，而且應該冇：
 *
 *   base.紫微.命宮      象義 = 主導／承擔／標準／體面   → 冇方向
 *   sihua.natal-科.官祿  象義 = 呈現／秩序／名目        → 冇方向
 *   sihua.natal-忌.官祿  象義 = 牽制／反覆／需要承擔    → 阻力
 *   sanfang.官祿-support 象義 = 結構上有多重支持        → 順
 *
 * C4 寫基塊嗰陣就已經決定咗「基塊只寫交集張力，唔寫吉凶」——
 * 呢度只係將嗰個決定嘅後果誠實噉接落去：**基塊派生嘅規則一條都投唔到方向票。**
 * 呢個唔係 bug，係 C4 個設計。想基塊有方向，就要改基塊嘅象義，而改象義要引得出書。
 */
import raw from './rules/valence.json';
import type { Rule, RuleRegistry } from './rule';

const DOC = raw as unknown as { support: string[]; pressure: string[]; neutral: string[] };

const SUPPORT = new Set(DOC.support);
const PRESSURE = new Set(DOC.pressure);
const NEUTRAL = new Set(DOC.neutral);

/** 一個方向：順向（支持）定阻力向。 */
export type Direction = 'support' | 'pressure';

/**
 * 一條規則嘅方向。
 *
 * `mixed` = 象義同時中兩邊。一條兩邊都講嘅規則，等於邊邊都冇講 ——
 * 佢入唔到任何一個候選嘅同向票，但仍然係證據，要留喺 evidence[] 度追溯。
 */
export type RuleValence = Direction | 'neutral' | 'mixed';

export function phraseValence(phrase: string): RuleValence | 'unclassified' {
  if (SUPPORT.has(phrase)) return 'support';
  if (PRESSURE.has(phrase)) return 'pressure';
  if (NEUTRAL.has(phrase)) return 'neutral';
  return 'unclassified';
}

export function ruleValence(rule: Rule): RuleValence {
  let s = false;
  let p = false;
  for (const x of rule.allowed_xiang) {
    const v = phraseValence(x);
    if (v === 'support') s = true;
    if (v === 'pressure') p = true;
  }
  if (s && p) return 'mixed';
  if (s) return 'support';
  if (p) return 'pressure';
  return 'neutral';
}

/**
 * ⚠ 未分類嘅象義詞。**呢個 list 一定要係空**，有測試守住。
 *
 * 佢存在嘅理由：加一條新規則、寫一個新象義詞，就一定要即場決定
 * 「呢個詞算唔算講緊方向」。分類唔落 `valence.json` 就 build fail ——
 * 所以冇人可以靜靜雞加一個有方向嘅詞入去，令一個主題突然夠票。
 */
export function unclassifiedXiang(reg: RuleRegistry): string[] {
  const out = new Set<string>();
  for (const r of reg.rules) {
    for (const x of r.allowed_xiang) if (phraseValence(x) === 'unclassified') out.add(x);
  }
  return [...out].sort();
}

/** 診斷用：規則庫入面邊啲規則講得出方向。 */
export function directionalRules(reg: RuleRegistry): { support: string[]; pressure: string[]; mixed: string[] } {
  const support: string[] = [];
  const pressure: string[] = [];
  const mixed: string[] = [];
  for (const r of reg.approved) {
    const v = ruleValence(r);
    if (v === 'support') support.push(r.rule_id);
    else if (v === 'pressure') pressure.push(r.rule_id);
    else if (v === 'mixed') mixed.push(r.rule_id);
  }
  return { support: support.sort(), pressure: pressure.sort(), mixed: mixed.sort() };
}
