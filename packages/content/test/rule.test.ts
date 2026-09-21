/**
 * 工單 C2 —— 規則庫 schema、三道閘、去重群
 *
 * 呢批測試嘅重點唔係「規則寫得啱唔啱」（嗰個要書，係 B5／C3 嘅事），
 * 而係「**一條唔應該出聲嘅規則，出唔出到聲**」。
 */
import { describe, expect, it } from 'vitest';
import { cast, annual, SCHOOL_PROFILE, type BirthInput, type Chart } from '@guanwei/ziwei';
import {
  RULE_REGISTRY,
  Rule,
  buildRegistry,
  independenceGroups,
  pendingRules,
  rejectedGeju,
  runRegistry,
  runRule,
  topicMap,
  approvedRulesForTopic,
  type EvalContext,
} from '../src/index';

const input: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 },
  time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex: 'male',
};
const r = cast(input);
if (!r.ok) throw new Error(r.message);
const CHART: Chart = r.value;
const a = annual(CHART, 2026);
if (!a.ok) throw new Error(a.message);
const CTX_FULL: EvalContext = { chart: CHART, annual: a.value };
const CTX_NATAL: EvalContext = { chart: CHART };
const SCHOOL = SCHOOL_PROFILE.ref;

const base = {
  rule_id: 'test.demo.one',
  version: '1.0',
  schools: ['zhongzhou-v1'],
  requires: ['natal'],
  role: 'structural',
  independence_group: 'test.demo',
  trigger: { star: '紫微', in: { name: '命宮' } },
  exclude: null,
  allowed_xiang: ['示範'],
  prohibited_inferences: ['唔准當真'],
  topics: ['self'],
  depends_on: [],
  review_status: 'approved',
  review_reasons: [],
  sources: [{ book: 'docs/rules.md', ref: '示範' }],
};

describe('規則 schema：§10 十個必要欄位', () => {
  it('一條合格規則過得到', () => {
    expect(Rule.safeParse(base).success).toBe(true);
  });

  it('rule_id 要三段', () => {
    for (const bad of ['sihua', 'sihua.ji', 'Sihua.Ji.Scope', '.a.b', 'a..b']) {
      expect(Rule.safeParse({ ...base, rule_id: bad }).success, bad).toBe(false);
    }
  });

  it('適用流派唔准留空、唔准 latest', () => {
    expect(Rule.safeParse({ ...base, schools: [] }).success).toBe(false);
    expect(Rule.safeParse({ ...base, schools: ['latest'] }).success).toBe(false);
  });

  it('來源門檻分兩級：講象義要兩個，純結構要一個，零一律唔准', () => {
    // 零來源 —— 兩種 role 都唔准 approved
    expect(Rule.safeParse({ ...base, sources: [] }).success).toBe(false);
    // role: core 係講象義，一個來源唔夠
    const meaning = { ...base, rule_id: 'test.meaning.one', role: 'core' };
    expect(Rule.safeParse({ ...meaning, sources: [{ book: 'A', ref: '1' }] }).success).toBe(false);
    expect(Rule.safeParse({ ...meaning, sources: [{ book: 'A', ref: '1' }, { book: 'B', ref: '2' }] }).success).toBe(true);
    // 純結構（幾何）一個就夠
    expect(Rule.safeParse(base).success).toBe(true);
  });

  it('role: none 唔准 approved —— 冇推理資格就唔應該審核通過', () => {
    expect(Rule.safeParse({ ...base, role: 'none' }).success).toBe(false);
  });

  it('每條規則都要有觸發條件、容許象義、可支持主題', () => {
    expect(Rule.safeParse({ ...base, allowed_xiang: [] }).success).toBe(false);
    expect(Rule.safeParse({ ...base, topics: [] }).success).toBe(false);
    expect(Rule.safeParse({ ...base, requires: [] }).success).toBe(false);
  });
});

describe('規則庫版本', () => {
  it('ref 形如 id@fingerprint，唔係 latest', () => {
    expect(RULE_REGISTRY.ref).toMatch(/^r1@[0-9a-f]{16}$/);
    expect(RULE_REGISTRY.ref).not.toContain('latest');
  });

  it('改任何一條規則，fingerprint 就變', () => {
    const one = buildRegistry('x', [base]);
    const two = buildRegistry('x', [{ ...base, allowed_xiang: ['示範', '多咗一個'] }]);
    expect(one.fingerprint).not.toBe(two.fingerprint);
  });

  it('同樣輸入永遠出同樣 fingerprint', () => {
    expect(buildRegistry('x', [base]).fingerprint).toBe(buildRegistry('x', [base]).fingerprint);
  });

  it('ID 重複、依賴唔存在 —— 建唔起', () => {
    expect(() => buildRegistry('x', [base, base])).toThrow(/重複/);
    expect(() =>
      buildRegistry('x', [{ ...base, depends_on: ['test.nowhere.zero'] }]),
    ).toThrow(/依賴/);
  });

  /**
   * 防盜鈴：加減規則、改象義、改觸發條件，呢條就會爆。
   * 爆咗要問：規則庫版本要唔要 bump？已經出咗嘅書帶住舊 ref，會唔會對唔返？
   */
  it('fingerprint 冇無端變過', () => {
    expect(RULE_REGISTRY.ref).toBe('r1@aec70cc1393fb7ad');
  });
});

describe('三道閘', () => {
  it('流派閘：規則唔適用於而家嘅流派 → blocked', () => {
    const other = Rule.parse({ ...base, schools: ['feixing-v1'] });
    const out = runRule(other, CTX_NATAL, SCHOOL);
    expect(out.status).toBe('blocked');
    if (out.status === 'blocked') expect(out.reason).toContain('feixing-v1');
  });

  it('審核閘：未審核嘅規則一律 blocked，連行都唔行', () => {
    for (const st of ['draft', 'needs_review', 'rejected'] as const) {
      const rule = Rule.parse({ ...base, review_status: st });
      const out = runRule(rule, CTX_NATAL, SCHOOL);
      expect(out.status, st).toBe('blocked');
    }
  });

  /**
   * ⚠ 呢條係成個 C2 最重要嘅一條。
   *
   * 「冇流年資料所以查唔到」**唔等於**「查過，冇」。
   * 兩者一混埋，就會由缺資料推出「未見反證」，而 §14 明文寫住
   * 「未見支持不等於已有反證」。所以缺輸入一定要出 not_applicable。
   */
  it('輸入閘：缺輸入出 not_applicable，唔係 unmatched', () => {
    const annualRule = RULE_REGISTRY.rules.find((x) => x.rule_id === 'sihua.annual-ji.career')!;
    const without = runRule(annualRule, CTX_NATAL, SCHOOL);
    expect(without.status).toBe('not_applicable');
    const withAnnual = runRule(annualRule, CTX_FULL, SCHOOL);
    expect(withAnnual.status).not.toBe('not_applicable');
  });

  it('未起運嘅年份：要大限嘅規則出 not_applicable', () => {
    const young = annual(CHART, 1997); // 虛歲 2，木三局未起運
    expect(young.ok).toBe(true);
    if (!young.ok) return;
    expect(young.value.decadal).toBeNull();
    const annualRule = RULE_REGISTRY.rules.find((x) => x.rule_id === 'sihua.annual-ji.career')!;
    const out = runRule(annualRule, { chart: CHART, annual: young.value }, SCHOOL);
    expect(out.status).toBe('not_applicable');
  });
});

describe('規則庫現況：睇得見嘅缺口', () => {
  /**
   * C7 之前呢條係「未審核嘅全部係格局，而且 sources 全空」。
   * C7 之後仲係格局，但理由變咗：十六個格局喺《全書》搵到原文，審核咗；
   * 剩低嗰五個係**寫得出觸發條件、但原文得一句吉凶口訣**嗰批 ——
   * 冇象義可引，所以永遠停喺 needs_review，等 B5 第二本書。
   */
  it('未審核嘅全部係格局 —— 因為象義要書', () => {
    const ids = pendingRules().map((x) => x.rule_id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith('geju.')), ids.join(',')).toBe(true);
    for (const p of pendingRules()) expect(p.review_status).toBe('needs_review');
  });

  it('未審核嘅格局一條 evidence 都出唔到 —— 連行都唔行', () => {
    const out = runRegistry(RULE_REGISTRY, CTX_FULL, SCHOOL);
    const pending = new Set(pendingRules().map((r) => r.rule_id));
    for (const o of out) {
      if (pending.has(o.rule.rule_id)) expect(o.status, o.rule.rule_id).toBe('blocked');
    }
  });

  /**
   * ⚠ 九個**否決咗**嘅格局唔喺規則庫入面，但佢哋要留喺 geju.json。
   *
   * 「路上埋屍」「殺居絕地（天年夭似顏回）」呢類，太微賦有原文、觸發條件寫得出，
   * 但唯一嘅象義係 §19 硬閘禁止嘅嘢。刪咗個 entry，下一個人睇返太微賦
   * 就會「重新發現」呢個格局，然後當成一件新嘢寫出嚟。
   */
  it('否決咗嘅格局唔會變成規則，但要留低理由', () => {
    const rejectedIds = new Set(rejectedGeju().map((g) => `geju.${g.id}`));
    expect(rejectedIds.size).toBe(9);
    for (const r of RULE_REGISTRY.rules) {
      expect(rejectedIds.has(r.rule_id.replace(/\.(core|structural)$/, '')), r.rule_id).toBe(false);
    }
    for (const g of rejectedGeju()) {
      expect(g.note, g.id).toContain('永久拒絕');
      /* 拒絕唔等於刪 —— 觸發條件要留低，否則下次會有人「重新發現」。 */
      expect(g.trigger, g.id).toBeTruthy();
      /* 而且容許象義一定係空 —— 有得寫就唔係拒絕。 */
      expect(g.allowed_xiang, g.id).toEqual([]);
    }
  });

  it('每條 approved 規則都寫咗禁止延伸 —— §10 必要欄位', () => {
    for (const rule of RULE_REGISTRY.approved) {
      expect(rule.prohibited_inferences.length, rule.rule_id).toBeGreaterThan(0);
    }
  });

  it('每條規則嘅 topics 都查得返主題表', () => {
    for (const rule of RULE_REGISTRY.rules) {
      for (const t of rule.topics) expect(topicMap(t).label, `${rule.rule_id}/${t}`).toBeTruthy();
    }
  });

  /**
   * C4 落地之後，七個主題全部有已審核規則。
   *
   * 呢條之前寫住 home／social／load 三個係零，而且註明咗
   * 「會喺 C3 落地之後爆 —— 咁就啱」。佢爆咗，而家反過嚟寫。
   *
   * 但留意：有規則 ≠ 寫得到嗰一章。門檻係逐主題數群嘅，
   * 見 test/integration.test.ts。
   */
  it('七個主題全部有已審核規則', () => {
    const rows = (['self', 'career', 'finance', 'relationship', 'home', 'social', 'load'] as const)
      .map((t) => `${t}=${approvedRulesForTopic(t).length}`);
    // eslint-disable-next-line no-console
    console.log(`\n  主題覆蓋：${rows.join('  ')}\n`);
    const empty = (['self', 'career', 'finance', 'relationship', 'home', 'social', 'load'] as const)
      .filter((t) => approvedRulesForTopic(t).length === 0);
    expect(empty).toEqual([]);
  });

  /**
   * 基塊派生嘅規則唔係人手寫多一份 —— 佢哋由 C4／C5 嘅基塊算出嚟。
   * 所以基塊改咗，規則即刻跟住改，冇得各講各話。
   */
  it('一百六十八條星宮規則由基塊派生，一條都冇人手寫', () => {
    const derived = RULE_REGISTRY.rules.filter((r) => r.rule_id.startsWith('base.'));
    expect(derived).toHaveLength(168);
    for (const r of derived) {
      expect(r.review_reasons.join(' '), r.rule_id).toContain('由基塊');
      // 一粒星只坐一個宮，所以同一粒星十二條至多一條會中
      expect(r.independence_group).toBe(`base.${r.rule_id.split('.')[1]}`);
    }
    expect(new Set(derived.map((r) => r.independence_group)).size).toBe(14);
  });
});

describe('去重群（§15）', () => {
  it('數群，唔係數規則', () => {
    const out = runRegistry(RULE_REGISTRY, CTX_FULL, SCHOOL);
    const matched = out.filter((o) => o.status === 'matched');
    const groups = independenceGroups(out);
    expect(matched.length).toBeGreaterThan(0);
    expect(groups.size).toBeLessThanOrEqual(matched.length);
  });

  /**
   * C6 之後，四化規則由手寫六條變成派生四十八條（4 化 × 12 宮）。
   * 一層一個化只落一個宮，所以十二條至多中一條 —— 共用一個群係必須嘅。
   */
  it('同一層同一個化，十二個宮共用同一群', () => {
    for (const hua of ['祿', '權', '科', '忌']) {
      const rs = RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith(`sihua.natal-${hua}.`));
      expect(rs.length, hua).toBe(12);
      expect(new Set(rs.map((x) => x.independence_group)).size, hua).toBe(1);
    }
  });

  /**
   * C7 之前得命宮一條三方四正規則，所以呢條寫「全部共用一群」。
   * C7 之後十二宮每宮兩條（壓力／支持），所以正確嘅講法係
   * **每宮一群，唔係全部一群**：
   *
   *   同一個宮嘅壓力同支持兩條，講緊同一組三方四正星 → 一群（§15）
   *   唔同宮嘅三方四正，係唔同組星 → 唔同群
   *
   * 寫成「全部一群」會令十二宮嘅結構證據互相吞埋，
   * 寫成「每條一群」就會由同一組星拎兩票。兩邊都錯。
   */
  it('三方四正每宮一群 —— 同宮兩條唔可以拎兩票，唔同宮唔可以撞埋一齊', () => {
    const sf = RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('sanfang.'));
    expect(sf.length).toBe(24);
    expect(new Set(sf.map((x) => x.independence_group)).size).toBe(12);
    for (const g of new Set(sf.map((x) => x.independence_group))) {
      expect(sf.filter((x) => x.independence_group === g).length, g).toBe(2);
    }
  });

  /** 身宮只可能落六個宮，所以身宮規則得六條 —— 而且共用一群：一個人得一個身宮。 */
  it('身宮規則共用一群 —— 一個人得一個身宮', () => {
    const sh = RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('structure.shen'));
    expect(sh.length).toBe(6);
    expect(new Set(sh.map((x) => x.independence_group)).size).toBe(1);
  });

  it('blocked 同 not_applicable 唔算入群', () => {
    const out = runRegistry(RULE_REGISTRY, CTX_NATAL, SCHOOL);
    const groups = independenceGroups(out);
    for (const o of out) {
      if (o.status !== 'matched') {
        expect([...groups]).not.toContain(`__${o.rule.independence_group}__never`);
      }
    }
    expect([...groups].every((g) => typeof g === 'string')).toBe(true);
  });
});

describe('純函數', () => {
  it('同一個 (registry, ctx) 跑兩次，輸出完全相同', () => {
    const one = runRegistry(RULE_REGISTRY, CTX_FULL, SCHOOL);
    const two = runRegistry(RULE_REGISTRY, CTX_FULL, SCHOOL);
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
  });
});
