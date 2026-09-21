/**
 * 工單 C2 —— 規則庫接得返 §17 結論物件
 *
 * 呢個檔案答一條問題：**而家攞住一副真盤，我哋寫唔寫到嘢？**
 *
 * C2 交嗰陣答案係「幾乎寫唔到」—— 成張盤得一個去重群。
 * C4 → C5 → C6 → C7 之後，七個主題全部過到 §14 最低門檻。
 *
 * 但呢個檔案嘅工作冇變：**佢守住嘅係門檻本身，唔係一個好睇嘅數字。**
 * 所以每次門檻鬆咗一格，呢度就要補返一條問「乜嘢仲係寫唔到」——
 * 一個每次都答得出嘢嘅系統，就係一個冇門檻嘅系統。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type BirthInput } from '@guanwei/ziwei';
import {
  Interpretation,
  RULE_REGISTRY,
  SPEC_VERSION,
  canGrade,
  independenceGroups,
  runRegistry,
  toEvidence,
  baseBlockOf,
} from '../src/index';

const INPUT: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 },
  time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex: 'male',
};
const r = cast(INPUT);
if (!r.ok) throw new Error(r.message);
const CHART = r.value;
const a = annual(CHART, 2026);
if (!a.ok) throw new Error(a.message);

const OUT = runRegistry(RULE_REGISTRY, { chart: CHART, annual: a.value }, SCHOOL_PROFILE.ref);
const MATCHED = OUT.filter((o): o is Extract<typeof o, { status: 'matched' }> => o.status === 'matched');

function draft(grade: number | null, evidence: ReturnType<typeof toEvidence>, topic = 'self') {
  return {
    claim_id: 'c1', chart_id: 'chart-1', spec_version: SPEC_VERSION,
    school_profile_id: SCHOOL_PROFILE.ref,
    rule_registry_version: RULE_REGISTRY.ref,
    topic,
    time_scope: { layer: 'natal', year: null, start: null, end: null, year_boundary: 'lunar-new-year' },
    input_quality: 'complete', missing_inputs: [],
    evidence,
    supporting_ids: evidence.map((e) => e.id),
    counter_ids: [], mitigating_ids: [],
    evidence_check_note: '已掃過全部已審核規則，反向規則零命中（規則庫仲未有反向規則）',
    cross_checks: {
      natal: { status: 'passed', reason: '本命三方四正已核' },
      decade: { status: 'not_applicable', reason: '本命層結論' },
      annual: { status: 'not_applicable', reason: '本命層結論' },
      san_fang_si_zheng: { status: 'passed', reason: '命宮三方四正已算' },
      transformations: { status: 'passed', reason: '生年四化已掃' },
      overlap: { status: 'not_applicable', reason: '本命層結論' },
    },
    rating: {
      candidate_grade: grade, final_grade: grade,
      status: grade === null ? 'undetermined' : 'resolved',
      change_reason: canGrade(OUT, topic as never).reason, passed_gates: [],
    },
    interpretation_confidence: grade === null ? 'low' : 'high',
    confidence_reason: '規則庫覆蓋率低',
    xiang: '命宮三方四正有多重制約同多重支持',
    shi_trend: null, shi_scenarios: [], jie: [],
    user_context_refs: [], unknowns: ['格局規則未審核'],
    risk_flags: [], prohibited_inferences: ['煞多必凶', '吉多必吉'],
    title: null, body: null, reader_note: '呢一段暫時只作觀察，未夠證據出方向。',
    review_status: 'draft', review_reasons: [],
  };
}

describe('規則庫 → evidence', () => {
  it('每個 binding 變一行 evidence，帶住 rule_id 同去重群', () => {
    const ev = MATCHED.flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) {
      expect(e.rule_id).toMatch(/\./);
      expect(e.independence_group).toBeTruthy();
      expect(e.source_ref).toMatch(/^chart:\/\//);
    }
  });

  it('evidence 行數多過去重群數 —— 呢個正正係要去重嘅原因', () => {
    const ev = MATCHED.flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    expect(ev.length).toBeGreaterThan(independenceGroups(OUT).size);
  });

  it('每條命中嘅基塊規則都追得返去一條基塊', () => {
    for (const o of MATCHED) {
      if (!o.rule.rule_id.startsWith('base.')) continue;
      const [, star, palace] = o.rule.rule_id.split('.');
      expect(baseBlockOf(star!, palace!), o.rule.rule_id).not.toBeNull();
    }
  });
});

describe('§14 單一訊號禁則：由規則庫一路守到結論物件', () => {
  /**
   * ⚠ 門檻係**逐主題**數群，唔係成張盤數群。
   *
   * 規範 §16 第一句：「評級對象必須是指定時間範圍內的指定主題。」
   *
   * C4 落地之後，成張盤一次過命中七個群（六粒主星各坐一個宮，加三方四正）。
   * 如果唔分主題，門檻就好似一下子過晒 —— 但當中五條講緊完全唔同嘅主題。
   * 講職涯嗰條結論，唔可以攞「太陰坐田宅」去湊夠票。
   */
  it('成張盤三十三個群，但逐主題數就完全唔同', () => {
    expect(independenceGroups(OUT).size).toBe(33);
    const byTopic = (['self', 'career', 'finance', 'relationship', 'home', 'social', 'load'] as const)
      .map((t) => [t, canGrade(OUT, t).groups] as const);
    // eslint-disable-next-line no-console
    console.log(`\n  逐主題群數：${byTopic.map(([t, n]) => `${t}=${n}`).join('  ')}\n`);
    expect(Object.fromEntries(byTopic)).toEqual({
      self: 12, career: 5, finance: 5, relationship: 3, home: 2, social: 4, load: 4,
    });
    /* 三十三個群加埋，遠多過任何一個主題 —— 唔分主題就等於畀成張盤互相湊票。 */
    expect(Math.max(...byTopic.map(([, n]) => n))).toBeLessThan(independenceGroups(OUT).size);
  });

  /**
   * C7 之後七個主題全部過到 §14 —— 但**唔好將呢個讀成「而家乜都寫得到」**。
   *
   * §14 只係最低門檻（兩個群）。過咗佢之後仲有 §16 嘅階梯，
   * 而 home 就卡喺嗰度：兩個群，出得到「順／慎」，出唔到「進／逆」。
   *
   * 而且 home 卡住嘅原因唔係規則庫唔夠 —— 田宅嗰兩條三方四正規則
   * 寫咗、審核咗、跑咗，只係冇命中。呢副盤嘅田宅真係靜。
   * 「我哋寫唔到」同「呢副盤冇嘢好講」係兩件事，而第二樣係正確答案。
   */
  it('七個主題全部過到 §14，但 home 仍然停喺最低一級', () => {
    for (const t of ['self', 'career', 'finance', 'relationship', 'home', 'social', 'load'] as const) {
      expect(canGrade(OUT, t).ok, t).toBe(true);
    }
    expect(canGrade(OUT, 'home').groups).toBe(2);
  });

  /**
   * 門檻要守得住，唔可以靠「而家啱啱夠」。
   *
   * 所以呢條唔攞真盤嘅主題嚟試 —— 而家七個主題全部夠票，
   * 攞邊個都試唔到呢道閘。改為**夾硬淨低一個群**：
   * 一條證據，出 −2，schema 要打返轉頭。
   */
  it('群數唔夠 → 出評級會被 schema 打返轉頭', () => {
    const one = MATCHED.filter((o) => o.rule.independence_group === 'base.破軍');
    expect(new Set(one.map((o) => o.rule.independence_group)).size).toBe(1);
    const ev = one.flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    const bad = Interpretation.safeParse({
      ...draft(-2, ev, 'finance'), interpretation_confidence: 'high',
    });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(JSON.stringify(bad.error.issues)).toContain('單一訊號');
  });

  it('出 null 就過到 —— 唔夠證據嘅正確做法係唔出方向，唔係出個弱啲嘅方向', () => {
    const ev = MATCHED.filter((o) => o.rule.independence_group === 'base.破軍')
      .flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    const ok = Interpretation.safeParse(draft(null, ev, 'finance'));
    if (!ok.success) throw new Error(JSON.stringify(ok.error.issues));
    expect(ok.success).toBe(true);
  });

  /**
   * 另一面：relationship 有三個群（天府坐夫妻、武曲坐夫妻、夫妻三方四正），門檻過得到。
   * 呢個係 C4 加 C7 帶嚟嘅真進展 —— 之前成張盤得一個群，乜都寫唔到。
   *
   * 但過咗 §14 唔等於寫得到 ±3：§16 仲要三群先出得到進／逆、四群先出得到盛／險。
   */
  it('relationship 三個群 → 過到 §14', () => {
    const g = canGrade(OUT, 'relationship');
    expect(g.ok).toBe(true);
    expect(g.groups).toBe(3);
    const ev = MATCHED.filter((o) => o.rule.topics.includes('relationship'))
      .flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    const ok = Interpretation.safeParse({
      ...draft(-1, ev, 'relationship'), interpretation_confidence: 'medium',
    });
    expect(ok.success).toBe(true);
  });

  it('grade null 就唔准有 title / body，只可以出 reader_note', () => {
    const ev = MATCHED.flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    const withTitle = Interpretation.safeParse({ ...draft(null, ev, 'self'), title: '你今年會轉工' });
    expect(withTitle.success).toBe(false);
  });
});

describe('§17 必要欄位：兩個版本號都 pin 得住', () => {
  it('school_profile_id 同 rule_registry_version 都唔係 latest', () => {
    const ev = MATCHED.flatMap((o) => toEvidence(o, 'support', 'chart-1'));
    const o = draft(null, ev);
    expect(o.school_profile_id).toMatch(/@[0-9a-f]{16}$/);
    expect(o.rule_registry_version).toMatch(/@[0-9a-f]{16}$/);
    const bad = Interpretation.safeParse({ ...o, rule_registry_version: 'latest' });
    expect(bad.success).toBe(false);
  });
});
