/**
 * 工單 C1 —— 內容 lint 測試
 *
 * 下面「最低回歸案例」一節，逐條對應 docs/voice-spec.md §26 最後一段。
 * 嗰段係規範自己開出嚟嘅測試清單 —— 改規範就要重跑呢批。
 */
import { describe, expect, it } from 'vitest';
import {
  hasError,
  lintBlock,
  lintInterpretation,
  scanForbidden,
  scanSeverity,
  type Finding,
} from '../src/index';

const codes = (fs: Finding[]) => fs.filter((f) => f.level === 'error').map((f) => f.code);

/* ── 內容庫 ── */

const BLOCK = {
  id: 'base.wuqu.caibo',
  level: 'L1',
  star: '武曲',
  palace: '財帛',
  school: '三合／中州',
  words: 218,
  sources: [
    { book: '紫微斗數全書', ref: '卷三·武曲' },
    { book: '中州派紫微斗數講義', ref: '第七章' },
  ],
  status: 'published',
  body: '武曲是財星，也是執行之星。它落在你的財帛宮，是本位。',
};

describe('基塊 schema（工單 C1 驗收）', () => {
  it('合格嘅塊過到', () => {
    expect(lintBlock(BLOCK)).toEqual([]);
  });

  it('少過兩個 source → fail', () => {
    const f = lintBlock({ ...BLOCK, sources: [BLOCK.sources[0]] });
    expect(hasError(f)).toBe(true);
    expect(f[0]!.message).toContain('至少兩個來源');
  });

  it('status: draft 唔入 build', () => {
    const f = lintBlock({ ...BLOCK, status: 'draft' });
    expect(f.some((x) => x.code === 'STATUS')).toBe(true);
  });

  it('L1 冇 star / palace → fail', () => {
    expect(hasError(lintBlock({ ...BLOCK, star: undefined }))).toBe(true);
  });

  it('disputed 唔准 published —— 各家說法不一要寫出嚟', () => {
    expect(hasError(lintBlock({ ...BLOCK, disputed: true }))).toBe(true);
  });

  it('黑名單字 → fail', () => {
    const f = lintBlock({ ...BLOCK, body: '這樣的結構注定守不住錢。' });
    expect(codes(f)).toContain('F1');
  });

  it('反例可以引用禁用詞 —— 規範本身要寫得出反例', () => {
    const f = lintBlock({
      ...BLOCK, counterexample: true,
      body: '不合格寫法：「今年一定破財」「注定守不住錢」。',
    });
    expect(hasError(f)).toBe(false);
  });
});

/* ── 黑名單 ── */

describe('黑名單（voice-spec §3、§4）', () => {
  const cases: [string, string, string][] = [
    ['宿命定論', '你注定要獨自走這段路。', 'F1'],
    ['恐嚇', '今年恐有血光之災，不化解就出事。', 'F2'],
    ['偽精準', '這一年的成功率大約七成。', 'F3'],
    ['百分比', '大約有 70% 機會出現轉機。', 'F3-pct'],
    ['事件偷渡', '可能有腫瘤方面的問題。', 'F4-hedge'],
    ['禁止事件', '這一年要留意車禍。', 'F5'],
    ['空泛套話', '綜合來看，你既有優勢也有挑戰。', 'F6'],
    ['強制安慰', '不過只要努力，一切都會好。', 'F7'],
    ['權威壓迫', '命盤不會錯，以後就知道。', 'F8'],
    ['商業恐嚇', '建議盡快化解，否則後患無窮。', 'F9'],
    ['替人決定', '以你的盤看，應該辭職。', 'F10'],
    ['保證式正向', '今年財運極佳，放心投資。', 'F11'],
  ];
  for (const [name, text, code] of cases) {
    it(`${name} → ${code}`, () => {
      expect(codes(scanForbidden(text, 'body'))).toContain(code);
    });
  }

  it('合規寫法唔會誤報', () => {
    const ok = '盤內財務阻力較集中；若已有資金周轉壓力，應先核對承擔能力。';
    expect(scanForbidden(ok, 'body')).toEqual([]);
  });
});

/* ── 字庫強度 vs 評級 ── */

describe('嚴重程度字庫（§8）', () => {
  it('「阻力較集中」要 -2 或以下', () => {
    expect(codes(scanSeverity('阻力較集中', 'body', -1, false))).toContain('S-GRADE');
    expect(scanSeverity('阻力較集中', 'body', -2, false)).toEqual([]);
  });

  it('「多層阻力集中」要 -3', () => {
    expect(codes(scanSeverity('多層阻力集中於此主題', 'body', -2, false))).toContain('S-GRADE');
  });

  it('「錯誤成本偏高」要有讀者現實背景', () => {
    expect(codes(scanSeverity('錯誤成本偏高', 'body', -3, false))).toContain('S-CONTEXT');
    expect(codes(scanSeverity('錯誤成本偏高', 'body', -3, true))).not.toContain('S-CONTEXT');
  });

  it('「值得主動爭取」要 +2 或以上', () => {
    expect(codes(scanSeverity('值得主動爭取', 'body', 1, false))).toContain('S-GRADE');
  });
});

/* ── 結論物件 ── */

function interp(over: Record<string, unknown> = {}) {
  const base = {
    claim_id: 'c1', chart_id: 'ch1', spec_version: '1.0',
    school_profile_id: 'zhongzhou-v1', rule_registry_version: 'reg-v1',
    topic: 'career',
    time_scope: { layer: 'natal', year: null, start: null, end: null, year_boundary: 'lunar-new-year' },
    input_quality: 'complete', missing_inputs: [],
    evidence: [
      ev('E1', 'natal', 'core', 'G1'),
      ev('E2', 'natal', 'structural', 'G2'),
    ],
    supporting_ids: ['E1', 'E2'], counter_ids: [], mitigating_ids: [],
    evidence_check_note: '已查本命三方四正，未見有效反向核心群。',
    cross_checks: {
      natal: ok(), decade: na(), annual: na(),
      san_fang_si_zheng: ok(), transformations: ok(), overlap: na(),
    },
    rating: { candidate_grade: -1, final_grade: -1, status: 'resolved',
      change_reason: '兩群同向，一群核心。', passed_gates: ['gate-1'] },
    interpretation_confidence: 'medium', confidence_reason: '必要資料完整。',
    xiang: '本命官祿相關結構。', shi_trend: '推進條件需要較多協調。',
    shi_scenarios: [{ text: '若工作依賴跨部門配合', condition: '有跨部門協作', evidence_ids: ['E1'] }],
    jie: [{ type: 'observation', text: '留意承諾與可交付之間的距離。' }],
    user_context_refs: [], unknowns: ['實際職位'], risk_flags: [], prohibited_inferences: [],
    title: '慎重與拖延之間的距離', body: '盤內呈現的是協調成本，不是能力高低。',
    reader_note: null, review_status: 'approved', review_reasons: [],
  };
  return { ...base, ...over };
}
const ev = (id: string, layer: string, role: string, group: string) => ({
  id, source_ref: `chart://${id}`, layer, palace: '官祿', star: '武曲',
  transformation: null, rule_id: 'R-CAREER-01', direction: 'support',
  role, independence_group: group,
});
const ok = () => ({ status: 'passed', reason: '已查' });
const na = () => ({ status: 'not_applicable', reason: '本命篇章' });
const failed = (r: string) => ({ status: 'failed', reason: r });

describe('結論物件（§16、§17）', () => {
  it('合格嘅結論過到', () => {
    expect(hasError(lintInterpretation(interp()))).toBe(false);
  });

  it('grade 係 null 就唔准有 title / body', () => {
    const f = lintInterpretation(interp({
      rating: { candidate_grade: null, final_grade: null, status: 'undetermined',
        change_reason: '未達門檻。', passed_gates: [] },
    }));
    expect(f.some((x) => x.message.includes('唔准有 title'))).toBe(true);
  });

  it('low 置信度唔准出方向評級', () => {
    const f = lintInterpretation(interp({ interpretation_confidence: 'low' }));
    expect(f.some((x) => x.message.includes('唔准發布方向評級'))).toBe(true);
  });

  it('medium 上限係 ±2', () => {
    const f = lintInterpretation(interp({
      rating: { candidate_grade: -3, final_grade: -3, status: 'resolved', change_reason: 'x', passed_gates: [] },
    }));
    expect(f.some((x) => x.message.includes('medium 置信度上限'))).toBe(true);
  });

  it('「平」唔可以由缺資料產生', () => {
    const f = lintInterpretation(interp({
      input_quality: 'incomplete', missing_inputs: ['decade'],
      rating: { candidate_grade: 0, final_grade: 0, status: 'resolved', change_reason: 'x', passed_gates: [] },
    }));
    expect(f.some((x) => x.message.includes('「平」要輸入完整'))).toBe(true);
  });

  it('fixture:// 唔准 approved', () => {
    const f = lintInterpretation(interp({
      evidence: [
        { ...ev('E1', 'natal', 'core', 'G1'), source_ref: 'fixture://x' },
        ev('E2', 'natal', 'structural', 'G2'),
      ],
    }));
    expect(f.some((x) => x.message.includes('fixture://'))).toBe(true);
  });

  it('情境引用唔存在嘅 evidence → fail', () => {
    const f = lintInterpretation(interp({
      shi_scenarios: [{ text: 'x', condition: 'y', evidence_ids: ['E99'] }],
    }));
    expect(codes(f)).toContain('GATE-EVIDENCE');
  });
});

/* ──────────────────────────────────────────────
   最低回歸案例（voice-spec §26 最後一段）
   改規範就要重跑呢一批。
   ────────────────────────────────────────────── */

describe('最低回歸案例（§26）', () => {
  it('單忌須阻擋', () => {
    const f = lintInterpretation(interp({
      evidence: [ev('E1', 'annual', 'core', 'G1')],
      supporting_ids: ['E1'],
    }));
    expect(f.some((x) => x.message.includes('單一訊號唔准下結論'))).toBe(true);
  });

  it('四次重述同一忌不得升級', () => {
    // 四項證據，但全部同一個去重群 —— 同一機制嘅四種講法
    const f = lintInterpretation(interp({
      evidence: ['E1', 'E2', 'E3', 'E4'].map((id) => ev(id, 'natal', 'core', 'G1')),
      supporting_ids: ['E1', 'E2', 'E3', 'E4'],
      rating: { candidate_grade: -2, final_grade: -2, status: 'resolved',
        change_reason: '四項同向。', passed_gates: [] },
    }));
    expect(f.some((x) => x.message.includes('進／逆要至少三群'))).toBe(true);
  });

  it('缺流年不得寫年度', () => {
    const f = lintInterpretation(interp({
      time_scope: { layer: 'annual', year: 2033, start: null, end: null, year_boundary: 'lunar-new-year' },
      cross_checks: {
        natal: ok(), decade: ok(), annual: failed('mapping_unverified'),
        san_fang_si_zheng: ok(), transformations: ok(), overlap: ok(),
      },
    }));
    expect(f.some((x) => x.message.includes('年度結論要本命／大限／流年三層'))).toBe(true);
  });

  it('高一致度疾厄訊號仍不得推病', () => {
    const f = lintInterpretation(interp({
      topic: 'health', risk_flags: ['health'],
      interpretation_confidence: 'high',
      evidence: ['E1','E2','E3','E4'].map((id, i) => ev(id, 'natal', 'core', 'G' + (i+1))),
      supporting_ids: ['E1','E2','E3','E4'],
      rating: { candidate_grade: -3, final_grade: -3, status: 'resolved',
        change_reason: '四群同向。', passed_gates: [] },
      review_reasons: ['manual_review_passed'],
    }));
    expect(codes(f)).toContain('GATE-HEALTH');
  });

  it('健康主題就算文字合規，一標評級就 fail', () => {
    const f = lintInterpretation(interp({
      risk_flags: ['health'],
      body: '此處僅作生活節奏的反思提示，無法據此判斷健康狀況。',
    }));
    expect(codes(f)).toContain('GATE-HEALTH');
  });

  it('單祿不得保證收入', () => {
    const f = lintInterpretation(interp({
      body: '今年財運極佳，放心投資，保證獲利。',
    }));
    expect(codes(f)).toContain('F11');
  });

  it('無現實失控背景不得用極重字庫', () => {
    const f = lintInterpretation(interp({
      interpretation_confidence: 'high',
      evidence: ['E1','E2','E3','E4'].map((id, i) => ev(id, 'natal', 'core', 'G' + (i+1))),
      supporting_ids: ['E1','E2','E3','E4'],
      rating: { candidate_grade: -3, final_grade: -3, status: 'resolved',
        change_reason: '四群同向。', passed_gates: [] },
      review_reasons: ['manual_review_passed'],
      user_context_refs: [],
      body: '如果問題已持續擴大，先停止追加承擔。',
    }));
    expect(codes(f)).toContain('S-EXTREME');
  });

  it('有現實背景就用得', () => {
    const f = lintInterpretation(interp({
      interpretation_confidence: 'high',
      evidence: ['E1','E2','E3','E4'].map((id, i) => ev(id, 'natal', 'core', 'G' + (i+1))),
      supporting_ids: ['E1','E2','E3','E4'],
      rating: { candidate_grade: -3, final_grade: -3, status: 'resolved',
        change_reason: '四群同向。', passed_gates: [] },
      review_reasons: ['manual_review_passed'],
      user_context_refs: ['uc-1'],
      title: '這一年，先看清承擔的邊界',
      body: '如果問題已持續擴大，先停止追加承擔。',
    }));
    expect(codes(f)).not.toContain('S-EXTREME');
  });

  it('本命頁唔准寫「這一年」', () => {
    const f = lintInterpretation(interp({ title: '這一年，先看清你的承擔' }));
    expect(codes(f)).toContain('T-SCOPE');
  });
});
