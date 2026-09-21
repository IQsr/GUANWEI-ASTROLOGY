/**
 * AI 收尾 ＋ 檢查閘（工單 C9）
 *
 * 出處：內容系統 §7、docs/voice-spec.md §18.8
 *
 * ── 呢個檔案入面冇模型 ──
 *
 * §7 准 AI 做三件事：刪塊間重複語、統一人稱時態、生成過場句。
 * 寫到 C9 先發現，**三件都已經有人做咗，而且係確定性程式做嘅**：
 *
 *   刪塊間重複語   → C8b 嘅重複片段偵測器，砌章嗰一刻剷走
 *   生成過場句     → C7 決定咗 AI 唔准作，只可以由 bank 揀
 *   統一人稱時態   → C9 掃出十四條基塊用「他」講讀者，改晒，而且寫咗入 schema
 *
 * 所以呢個 pipeline 冇模型嗰一格。但**閘要照建**，理由有兩個：
 *
 *   一、「我哋冇用模型」係一句承諾；一道跑得到嘅閘先係一個可以驗嘅事實。
 *   二、將來有人想加返一個模型（或者加一個人手編輯步驟），閘已經喺度。
 *
 * ── 閘嘅設計原則 ──
 *
 * 唔係「檢查佢寫得好唔好」，係**檢查佢有冇加嘢**。
 * 一個編輯准刪、准接、准換人稱；佢唔准加。所以每一道閘量嘅都係同一樣嘢：
 * 改完之後嗰句，有幾多係原文本來就有。
 */
import { scanForbidden, type Finding } from './lint';
import { isWhitelistedTransition } from './frame-data';
import type { Chapter, Segment } from './assemble';

/** 編輯交返嚟嘅嘢。要逐段對返，唔可以係一嚿文（§7：「輸出逐塊對應嘅結構化格式」）。 */
export type PolishedSegment = { source_id: string | null; text: string };

export type GateCode =
  | 'G-SHAPE'      // 段數／次序／出處對唔返
  | 'G-TRACE'      // 有字唔喺原文
  | 'G-GROW'       // 改完長過原文
  | 'G-CLAIM'      // 加咗原文冇嘅命理詞
  | 'G-NUMBER'     // 加咗數字、日期、年歲
  | 'G-TRANSITION' // 過場句唔喺白名單
  | 'G-FORBIDDEN'; // 黑名單命中

export type GateFinding = { code: GateCode; segment: number; message: string };

export type GateResult = {
  /** 過唔過。過唔到就退回出原塊 —— 寧願生硬，唔好失控（§7）。 */
  ok: boolean;
  findings: GateFinding[];
  /** 最終出街嗰批。ok 就係改完嗰批，唔 ok 就係原塊。 */
  segments: Segment[];
};

const CJK = /[^㐀-鿿]/g;
const cjk = (s: string) => s.replace(CJK, '');

function sentencesOf(t: string): string[] {
  return (t.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? []).filter((x) => cjk(x).length >= 4);
}

/**
 * 改完之後嗰句，有幾多字係原文本來就有（而且次序一樣）。
 *
 * 用最長公共子序列，唔用「包唔包含」—— 因為編輯准刪字。
 * 「這使你可靠，也使你顯得慢半拍」刪走中間一截仍然應該過，
 * 但插入「你註定」四個字就會即刻跌落嚟。
 */
export function traceRatio(polished: string, source: string): number {
  const a = cjk(polished);
  const b = cjk(source);
  if (a.length === 0) return 1;
  let prev = new Uint16Array(b.length + 1);
  let cur = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    }
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  return prev[b.length]! / a.length;
}

/** 人稱換掉唔算加嘢（§7 准「統一人稱」），所以比之前先歸一。 */
function normalise(s: string): string {
  return s.replace(/[你他她妳您]/g, '你').replace(/[了咗]/g, '了');
}

/** 命理詞。原文冇而改完有，就係加咗一個冇出處嘅主張。 */
const CLAIM_TERMS = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰',
  '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬',
  '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
  '化祿', '化權', '化科', '化忌', '廟', '旺', '陷',
  '大限', '流年', '本命', '三方四正', '格局',
];

const NUMBERS = /[0-9０-９]|[一二三四五六七八九十百千萬]\s*(?:年|月|日|歲|次|成)/;

/** 追溯門檻。0.9 = 改完嗰句最多有一成字係新嘅（接駁虛詞）。 */
export const TRACE_FLOOR = 0.9;

/**
 * 檢查閘。
 *
 * **純函數，冇模型，唔上網。** 佢收原塊同改完嘅稿，答一條問題：
 * 改完嗰份有冇加咗原塊冇嘅嘢。
 */
export function gate(raw: Segment[], polished: PolishedSegment[]): GateResult {
  const findings: GateFinding[] = [];
  const fail = (code: GateCode, segment: number, message: string) =>
    findings.push({ code, segment, message });

  if (polished.length !== raw.length) {
    fail('G-SHAPE', -1, `段數對唔返：原塊 ${raw.length} 段，改完 ${polished.length} 段`);
    return { ok: false, findings, segments: raw };
  }

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const p = polished[i]!;

    if (p.source_id !== r.source_id) {
      fail('G-SHAPE', i, `第 ${i} 段出處對唔返：原塊 ${r.source_id}，改完 ${p.source_id}`);
      continue;
    }

    /*
     * 過場句唔准改，一個字都唔准。
     * 佢哋係白名單本身 —— 改一個字就即刻唔喺白名單，而白名單就係
     * 「呢句唔係命理主張」嘅唯一憑據（C7 決定）。
     */
    if (r.slot === '過場') {
      if (!isWhitelistedTransition(p.text)) {
        fail('G-TRANSITION', i, `過場句唔喺白名單：「${p.text}」`);
      }
      continue;
    }

    if (cjk(p.text).length > cjk(r.text).length) {
      fail('G-GROW', i, `第 ${i} 段（${r.slot}）改完長咗：${cjk(r.text).length} → ${cjk(p.text).length} 字。編輯准刪唔准加`);
    }

    /*
     * ⚠ 追溯要**逐句**驗，唔可以逐段。
     *
     * C10 加咗四化之後，官祿嘅結構格由一百幾字變成兩百幾字。
     * 跟住嗰條「作一句出嚟」嘅測試就過咗閘 ——
     * 因為兩百字加十六個字作出嚟嘅字，追溯率仲有 0.93。
     *
     * **段越長，越食得落一句大話。** 呢個唔係門檻定得鬆，係量錯咗嘢：
     * 讀者唔係讀一段，佢係一句一句讀落去。所以逐句驗。
     */
    for (const sent of sentencesOf(p.text)) {
      const ratio = traceRatio(normalise(sent), normalise(r.text));
      if (ratio < TRACE_FLOOR) {
        fail('G-TRACE', i, `第 ${i} 段（${r.slot}）有一句追溯率 ${ratio.toFixed(2)} < ${TRACE_FLOOR}：「${sent.trim()}」`);
      }
    }

    const added = CLAIM_TERMS.filter((t) => p.text.includes(t) && !r.text.includes(t));
    if (added.length) {
      fail('G-CLAIM', i, `第 ${i} 段加咗原塊冇嘅命理詞：${added.join('、')}`);
    }

    if (NUMBERS.test(p.text) && !NUMBERS.test(r.text)) {
      fail('G-NUMBER', i, `第 ${i} 段加咗數字或者時間 —— §7 明文唔准`);
    }
  }

  /* §7 驗收：黑名單掃描零命中。呢個掃嘅係改完嗰份，唔係原塊。 */
  const forbidden: Finding[] = polished.flatMap((p) => scanForbidden(p.text, 'body'));
  for (const f of forbidden) fail('G-FORBIDDEN', -1, `${f.code} ${f.message}`);

  if (findings.length > 0) return { ok: false, findings, segments: raw };
  return {
    ok: true,
    findings: [],
    segments: raw.map((r, i) => ({ ...r, text: polished[i]!.text })),
  };
}

/* ──────────────────────────────────────────────
   Prompt：只畀塊，唔畀命盤
   ────────────────────────────────────────────── */

/**
 * §7 第一條實作要求：「prompt 只畀塊、**唔畀命盤**（見唔到盤就作唔到命理）。」
 *
 * 呢個唔係客氣話，係設計：一個見唔到宮位、見唔到星、見唔到四化嘅編輯，
 * 就算想作都作唔出一句命理 —— 佢淨係見到一堆已經寫好嘅中文。
 *
 * 所以呢個 function **收 `Segment[]`，唔收 `Chart`，亦都唔收宮名**。
 * 型別本身就係嗰道閘嘅第一半。
 */
export function polishPrompt(raw: Segment[]): { instructions: string; blocks: PolishedSegment[] } {
  return {
    instructions: [
      '你係編輯，唔係作者。下面每一段各自係一舊已經寫好、已經有出處嘅文字。',
      '',
      '准做：',
      '　1. 刪走段與段之間意思重複嘅字句',
      '　2. 統一人稱（一律用「你」）同時態',
      '',
      '唔准做：',
      '　1. 加入任何原文冇嘅命理判斷、星曜、宮位、四化、廟旺',
      '　2. 改動結論，或者加強、減弱語氣',
      '　3. 加入事件、時間、數字、例子',
      '　4. 改動標住「過場」嗰啲段落，一個字都唔准改',
      '　5. 自己寫過場句 —— 過場句只可以由已有嘅句庫揀',
      '',
      '輸出：逐段對應，數目、次序、source_id 全部要同輸入一樣。',
      '改完每段唔可以長過原段。',
    ].join('\n'),
    blocks: raw.map((s) => ({ source_id: s.source_id, text: s.text })),
  };
}

/* ──────────────────────────────────────────────
   Pipeline
   ────────────────────────────────────────────── */

export type Editor = (prompt: ReturnType<typeof polishPrompt>) => PolishedSegment[];

/**
 * 排盤(規則) → 取塊(規則) → **收尾** → **檢查閘** → 入庫（內容系統 §7）。
 *
 * `editor` 唔傳就冇收尾嗰一步 —— **而家嘅預設就係唔傳**。
 * 見檔案開頭：§7 准嘅三件事，三件都已經由確定性程式做咗。
 *
 * 過唔到閘就退回出原塊。**寧願生硬，唔好失控。**
 */
export function finishChapter(ch: Chapter, editor?: Editor): { chapter: Chapter; gate: GateResult } {
  if (!editor) {
    return { chapter: ch, gate: { ok: true, findings: [], segments: ch.segments } };
  }
  const result = gate(ch.segments, editor(polishPrompt(ch.segments)));
  return {
    chapter: { ...ch, segments: result.segments, text: result.segments.map((s) => s.text).join('') },
    gate: result,
  };
}
