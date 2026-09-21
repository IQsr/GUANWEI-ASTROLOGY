/**
 * 工單 C9 —— AI 收尾 ＋ 檢查閘
 *
 * ── 呢批測試守嘅唔係「編輯寫得好唔好」 ──
 *
 * 閘量嘅係同一樣嘢：**改完之後嗰句，有幾多係原文本來就有。**
 * 一個編輯准刪、准接、准換人稱；佢唔准加。
 *
 * 所以每一條測試都係同一個形狀：整一個會出事嘅編輯，
 * 確認閘攔得住，而且退回出原塊。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type BirthInput } from '@guanwei/ziwei';
import {
  BASE_BLOCKS,
  RULE_REGISTRY,
  SPEC_VERSION,
  TRACE_FLOOR,
  assembleAll,
  finishChapter,
  gate,
  inferAll,
  polishPrompt,
  traceRatio,
  type Editor,
  type PolishedSegment,
} from '../src/index';

const INPUT: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 }, time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'male',
};
const r = cast(INPUT);
if (!r.ok) throw new Error(r.message);
const a = annual(r.value, 2026);
if (!a.ok) throw new Error(a.message);
const BY_TOPIC = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, {
  chartId: 'c1', layer: 'natal',
});
const CH = assembleAll(r.value, BY_TOPIC, { seed: 'c1' });
const 官祿 = CH.find((c) => c.palace === '官祿')!;

/** 乖編輯：原文照抄。 */
const identity: Editor = (p) => p.blocks;
/** 攞一個會出事嘅編輯：淨係改一段。 */
const tamper = (i: number, f: (t: string) => string): Editor => (p) =>
  p.blocks.map((b, j) => (j === i ? { ...b, text: f(b.text) } : b));

const bodyIndex = 官祿.segments.findIndex((s) => s.slot === '結構');

describe('追溯率', () => {
  it('刪字唔會跌 —— 編輯准刪', () => {
    expect(traceRatio('這使你可靠，也顯得慢半拍。', '這使你可靠，也使你在需要當機立斷的場合顯得慢半拍。')).toBe(1);
  });

  it('插字會跌 —— 編輯唔准加', () => {
    const src = '這使你可靠，也顯得慢半拍。';
    expect(traceRatio('這使你註定一世可靠，也顯得慢半拍。', src)).toBeLessThan(TRACE_FLOOR);
  });

  it('換人稱唔算加嘢（§7 准統一人稱）', () => {
    const { ok } = gate(
      [{ slot: '結構', text: '這使他可靠。', source_id: 'x', rule_ids: [] }],
      [{ source_id: 'x', text: '這使你可靠。' }],
    );
    expect(ok).toBe(true);
  });
});

describe('§7：唔准加嘢', () => {
  it('加一句宿命文案 → 攔得住，而且退回出原塊', () => {
    const bad = tamper(bodyIndex, (t) => t + '你註定為財奔波。');
    const { chapter, gate: g } = finishChapter(官祿, bad);
    expect(g.ok).toBe(false);
    expect(g.findings.map((f) => f.code)).toContain('G-FORBIDDEN');
    /* 最緊要嗰句：退回出原塊，唔係出一個「清理過」嘅版本。 */
    expect(chapter.text).toBe(官祿.text);
  });

  /**
   * ⚠ 黑名單捉唔到嘅嗰種先至係重點。
   *
   * 「這個結構傾向於在四十歲之後轉順」冇一個禁用詞 ——
   * 佢過到語氣 lint，但佢係一個原塊冇講過嘅斷言。
   * 追溯率就係為咗呢種句子而存在。
   */
  it('冇禁用詞但係作出嚟嘅一句 → 追溯率攔得住', () => {
    const bad = tamper(bodyIndex, (t) => t + '這個結構傾向於在四十歲之後轉順。');
    const g = finishChapter(官祿, bad).gate;
    expect(g.ok).toBe(false);
    expect(g.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining(['G-GROW', 'G-TRACE', 'G-NUMBER']),
    );
  });

  it('加一粒原塊冇嘅星 → 攔得住', () => {
    const bad = tamper(bodyIndex, (t) => t.replace('。', '，天梁在此可解。'));
    const g = finishChapter(官祿, bad).gate;
    expect(g.ok).toBe(false);
    expect(g.findings.map((f) => f.code)).toContain('G-CLAIM');
  });

  it('改完長過原文 → 攔得住，唔使睇內容都知佢加咗嘢', () => {
    const bad = tamper(bodyIndex, (t) => t + '而且相當明顯。');
    const g = finishChapter(官祿, bad).gate;
    expect(g.findings.map((f) => f.code)).toContain('G-GROW');
  });
});

describe('§7：形狀唔准變', () => {
  it('少咗一段 → 攔得住', () => {
    const g = finishChapter(官祿, (p) => p.blocks.slice(1)).gate;
    expect(g.ok).toBe(false);
    expect(g.findings[0]!.code).toBe('G-SHAPE');
  });

  it('掉亂次序 → 攔得住', () => {
    const g = finishChapter(官祿, (p) => [...p.blocks].reverse()).gate;
    expect(g.ok).toBe(false);
    expect(g.findings.map((f) => f.code)).toContain('G-SHAPE');
  });

  it('兩段併埋一段 → 攔得住', () => {
    const g = finishChapter(官祿, (p) => {
      const b = [...p.blocks];
      b[0] = { ...b[0]!, text: b[0]!.text + b[1]!.text };
      return b.slice(0, -1).map((x, i) => (i === 0 ? x : b[i + 1]!));
    }).gate;
    expect(g.ok).toBe(false);
  });
});

describe('§7：過場句一個字都唔准改', () => {
  /**
   * 過場句係白名單本身。改一個字就即刻唔喺白名單 ——
   * 而白名單就係「呢句唔係命理主張」嘅唯一憑據（C7 決定）。
   */
  it('改一個標點都攔得住', () => {
    const i = 官祿.segments.findIndex((s) => s.slot === '過場');
    expect(i).toBeGreaterThanOrEqual(0);
    const g = finishChapter(官祿, tamper(i, (t) => t.replace('。', ''))).gate;
    expect(g.ok).toBe(false);
    expect(g.findings.map((f) => f.code)).toContain('G-TRANSITION');
  });

  it('自己作一句過場 → 攔得住', () => {
    const i = 官祿.segments.findIndex((s) => s.slot === '過場');
    const g = finishChapter(官祿, tamper(i, () => '接下來談談你的事業運。')).gate;
    expect(g.ok).toBe(false);
    expect(g.findings.map((f) => f.code)).toContain('G-TRANSITION');
  });
});

describe('§7：prompt 只畀塊，唔畀命盤', () => {
  /**
   * 「見唔到盤就作唔到命理」—— 呢個唔係客氣話，係設計。
   * `polishPrompt` 收 `Segment[]`，唔收 `Chart`，亦都唔收宮名。
   * **型別本身就係嗰道閘嘅第一半。**
   */
  it('prompt 入面冇宮名、冇地支、冇五行局、冇任何盤面資料', () => {
    const p = polishPrompt(官祿.segments);
    const json = JSON.stringify(p);
    for (const leak of ['地支', '子丑寅卯', '五行局', '水二局', '木三局', '金四局', '土五局', '火六局',
      '生年', '虛歲', '身宮', '命宮地支', '1996']) {
      expect(json.includes(leak), `prompt 漏咗 ${leak}`).toBe(false);
    }
    /* 塊本身當然有中文內容 —— 但佢哋係已經寫好嘅文，唔係盤。 */
    expect(p.blocks).toHaveLength(官祿.segments.length);
    expect(p.blocks.every((b) => typeof b.text === 'string')).toBe(true);
  });

  it('指示入面明文列咗准做同唔准做', () => {
    const { instructions } = polishPrompt(官祿.segments);
    expect(instructions).toContain('你係編輯，唔係作者');
    expect(instructions).toContain('統一人稱');
    expect(instructions).toContain('唔准做');
    expect(instructions).toContain('過場句只可以由已有嘅句庫揀');
  });
});

describe('乖編輯過得到閘', () => {
  it('原文照抄 → 過，而且輸出同原塊一樣', () => {
    const { chapter, gate: g } = finishChapter(官祿, identity);
    expect(g.ok).toBe(true);
    expect(g.findings).toEqual([]);
    expect(chapter.text).toBe(官祿.text);
  });

  it('十二章全部過得到 —— 閘唔會誤殺', () => {
    for (const c of CH) {
      const g = finishChapter(c, identity).gate;
      expect(g.ok, `${c.palace}：${g.findings.map((f) => f.message).join('｜')}`).toBe(true);
    }
  });

  /** 真係做嘢嘅乖編輯：刪走一句重複語。 */
  it('刪走重複語 → 過', () => {
    const del: Editor = (p) =>
      p.blocks.map((b, i) => (i === bodyIndex ? { ...b, text: b.text.replace(/[^。]*。$/, '') } : b));
    expect(finishChapter(官祿, del).gate.ok).toBe(true);
  });
});

/* ══════════════════════════════════════════════
   ⚠ C9 嘅結論
   ══════════════════════════════════════════════ */

describe('⚠ pipeline 入面冇模型', () => {
  /**
   * §7 准 AI 做三件事。寫到 C9 先發現，三件都已經有人做咗，
   * 而且係**確定性程式**做嘅：
   *
   *   刪塊間重複語   → C8b 嘅重複片段偵測器
   *   生成過場句     → C7 決定咗 AI 唔准作，只可以由 bank 揀
   *   統一人稱時態   → C9 改咗十四條基塊，而且寫咗入 schema
   *
   * 所以 `finishChapter` 唔傳 editor 就冇收尾嗰一步，而**預設就係唔傳**。
   */
  it('預設冇 editor —— 出嚟嘅逐個字都係原塊', () => {
    for (const c of CH) {
      const { chapter, gate: g } = finishChapter(c);
      expect(g.ok).toBe(true);
      expect(chapter).toEqual(c);
    }
  });

  /**
   * 人稱已經統一咗，所以呢一步真係冇嘢做 ——
   * 呢條測試就係嗰個「冇嘢做」嘅證據。
   */
  it('一百六十八條基塊、全部章框同 L3，冇一個「他」字', () => {
    for (const b of BASE_BLOCKS) {
      expect(/(?<!其)他(?!人)|她/.test(b.body), b.id).toBe(false);
    }
    for (const c of CH) {
      const ta = c.text.match(/(?<!其)他(?!人)|她/);
      expect(ta, `${c.palace} 出現「${ta?.[0]}」`).toBeNull();
    }
  });
});

describe('⚠ C10 照出嚟嘅一個閘漏洞：長段食得落一句大話', () => {
  /**
   * C10 加咗四化之後，官祿嘅結構格由一百幾字變成兩百幾字。
   * 跟住「作一句出嚟」嗰條測試就過咗閘 ——
   * 兩百字加十六個字作出嚟嘅字，段落追溯率仲有 0.93。
   *
   * **段越長，越食得落一句大話。** 呢個唔係門檻定得鬆，係量錯咗嘢：
   * 讀者唔係讀一段，佢係一句一句讀落去。改成逐句驗之後就攔得住。
   */
  it('一句作出嚟嘅嘢，唔會因為段落夠長而過到閘', () => {
    const long = 官祿.segments[bodyIndex]!;
    expect(long.text.length).toBeGreaterThan(150);

    /* 冇禁用詞、冇數字、長度只多咗一成幾 —— 舊嘅段落追溯率過得到。 */
    const sneaky = '這個結構偏向於在關係裡先退一步。';
    const bad = tamper(bodyIndex, (t) => t + sneaky);
    const g = finishChapter(官祿, bad).gate;
    expect(g.ok).toBe(false);
    const trace = g.findings.filter((f) => f.code === 'G-TRACE');
    expect(trace.length).toBeGreaterThan(0);
    expect(trace[0]!.message).toContain(sneaky.slice(0, 8));
  });

  it('段落夠長都好，逐句都要追得返', () => {
    for (const c of CH) {
      for (const seg of c.segments) {
        if (seg.slot === '過場') continue;
        for (const s of (seg.text.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [])) {
          if (s.replace(/[^㐀-鿿]/g, '').length < 4) continue;
          expect(traceRatio(s, seg.text), `${c.palace}/${seg.slot}`).toBe(1);
        }
      }
    }
  });
});
