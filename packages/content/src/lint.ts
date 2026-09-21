/**
 * 內容 lint（工單 C1）
 *
 * 規矩要去到可以寫成 script 嘅程度先算數。呢度做嘅係機器捉得到嗰半 ——
 * 捉唔到嗰半（甜化、空泛、替人決定嘅語氣、換盤測試）喺 docs/voice.md 第四節，
 * 由人手審。
 *
 * 出處：docs/voice-spec.md §3 §4 §8 §26
 */
import forbiddenDoc from './rules/forbidden.json';
import severityDoc from './rules/severity.json';
import { Block, Interpretation } from './schema';

export type Finding = {
  /** error 一定 fail build；warn 要人手睇。 */
  level: 'error' | 'warn';
  /** F1–F11、S-*、SCHEMA、GATE-* */
  code: string;
  message: string;
  /** 出事嗰個欄位。 */
  field?: string;
  /** 捉到嘅字，方便 grep。 */
  match?: string;
  spec?: string;
};

/** 面向讀者嘅欄位。sources / notes 唔掃。 */
const READER_FIELDS = ['title', 'body', 'reader_note'] as const;

type ForbiddenCat = {
  id: string; name: string; spec: string; reason: string;
  patterns?: string[];
  regex?: { id: string; re: string; why: string }[];
};

const CATEGORIES = (forbiddenDoc as { categories: ForbiddenCat[] }).categories;

/**
 * 掃黑名單。
 *
 * `counterexample: true` 嘅內容整段跳過 —— 規範本身要引用得到禁用詞
 * （voice-spec §3 最後一段）。
 */
export function scanForbidden(
  text: string,
  field: string,
  opts: { counterexample?: boolean } = {},
): Finding[] {
  if (opts.counterexample) return [];
  const out: Finding[] = [];

  for (const cat of CATEGORIES) {
    for (const p of cat.patterns ?? []) {
      if (text.includes(p)) {
        out.push({
          level: 'error', code: cat.id, field, match: p, spec: cat.spec,
          message: `${cat.name}：「${p}」—— ${cat.reason}`,
        });
      }
    }
    for (const r of cat.regex ?? []) {
      const m = new RegExp(r.re).exec(text);
      if (m) {
        out.push({
          level: 'error', code: r.id, field, match: m[0], spec: cat.spec,
          message: `${cat.name}：「${m[0]}」—— ${r.why}`,
        });
      }
    }
  }
  return out;
}

type SeverityDoc = {
  minGrade: { phrase: string; requires: number; alsoRequires?: string }[];
  extremeToneRequires: { grade: number; userContext: boolean; phrases: string[] };
};
const SEV = severityDoc as unknown as SeverityDoc;

/**
 * 字庫強度 vs 評級。
 *
 * 「標題強度不高於正文、評級及置信度」（§26 內容檢查）。
 * 低評級用重字係最常見嘅違規 —— 因為重字寫落去好睇。
 */
export function scanSeverity(
  text: string,
  field: string,
  grade: number | null,
  hasUserContext: boolean,
): Finding[] {
  const out: Finding[] = [];

  for (const rule of SEV.minGrade) {
    if (!text.includes(rule.phrase)) continue;

    const ok = grade !== null &&
      (rule.requires < 0 ? grade <= rule.requires : grade >= rule.requires);
    if (!ok) {
      out.push({
        level: 'error', code: 'S-GRADE', field, match: rule.phrase, spec: '§8',
        message: `「${rule.phrase}」要 ${rule.requires} 級或以上先用得（而家 grade = ${grade}）`,
      });
    }
    if (rule.alsoRequires === 'user_context' && !hasUserContext) {
      out.push({
        level: 'error', code: 'S-CONTEXT', field, match: rule.phrase, spec: '§8',
        message: `「${rule.phrase}」只可以喺讀者已確認嘅現實背景下用 —— 唔准單憑盤面講`,
      });
    }
  }

  for (const p of SEV.extremeToneRequires.phrases) {
    if (text.includes(p) && (grade !== SEV.extremeToneRequires.grade || !hasUserContext)) {
      out.push({
        level: 'error', code: 'S-EXTREME', field, match: p, spec: '§8',
        message: `極重語氣「${p}」要「險」+ 讀者已確認嘅現實失控背景`,
      });
    }
  }
  return out;
}

/** 標題：8–18 個中文字（§5）。超出唔係 error —— 規範寫「可依自然語意調整」。 */
export function scanTitle(title: string): Finding[] {
  const n = [...title].filter((c) => /\S/.test(c)).length;
  if (n >= 8 && n <= 18) return [];
  return [{
    level: 'warn', code: 'T-LEN', field: 'title', spec: '§5',
    message: `標題 ${n} 字（建議 8–18）。「可依自然語意調整」，但太短通常代表唔夠具體`,
  }];
}

/** 本命頁唔准寫「這一年」；只有年度資料唔准寫「你一生」（§5）。 */
export function scanTitleScope(title: string, layer: 'natal' | 'decade' | 'annual'): Finding[] {
  const out: Finding[] = [];
  if (layer === 'natal' && /這一年|今年|明年/.test(title)) {
    out.push({ level: 'error', code: 'T-SCOPE', field: 'title', spec: '§5',
      message: '本命頁唔准寫「這一年」—— 本命冇年度範圍' });
  }
  if (layer === 'annual' && /你一生|一輩子|終生/.test(title)) {
    out.push({ level: 'error', code: 'T-SCOPE', field: 'title', spec: '§5',
      message: '只有年度資料唔准寫「你一生」' });
  }
  return out;
}

/* ──────────────────────────────────────────────
   入口
   ────────────────────────────────────────────── */

export function lintBlock(raw: unknown): Finding[] {
  const parsed = Block.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      level: 'error' as const, code: 'SCHEMA',
      field: i.path.join('.') || undefined,
      message: i.message,
    }));
  }
  const b = parsed.data;
  const out: Finding[] = [];

  // status: draft 唔入 build（工單 C1 驗收）
  if (b.status !== 'published') {
    out.push({ level: 'warn', code: 'STATUS',
      message: `status = ${b.status} —— 唔會入 build` });
  }

  out.push(...scanForbidden(b.body, 'body', { counterexample: b.counterexample }));
  return out;
}

/**
 * 結論物件。
 *
 * ⚠ 而家冇引擎產生得到呢個 object —— 呢條 lint 係為咗鎖低契約，
 * 同埋令 C8 / C9 一開工就有嘢頂住。見 docs/voice.md 第五節。
 */
export function lintInterpretation(raw: unknown): Finding[] {
  const parsed = Interpretation.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      level: 'error' as const, code: 'SCHEMA',
      field: i.path.join('.') || undefined,
      message: i.message,
    }));
  }
  const o = parsed.data;
  const out: Finding[] = [];
  const grade = o.rating.final_grade;
  const hasCtx = o.user_context_refs.length > 0;

  for (const f of READER_FIELDS) {
    const text = o[f];
    if (!text) continue;
    out.push(...scanForbidden(text, f));
    out.push(...scanSeverity(text, f, grade, hasCtx));
  }
  if (o.title) {
    out.push(...scanTitle(o.title));
    out.push(...scanTitleScope(o.title, o.time_scope.layer));
  }

  // §4：健康／死亡唔准出盤面風險分
  if ((o.risk_flags.includes('health') || o.risk_flags.includes('death')) && grade !== null) {
    out.push({ level: 'error', code: 'GATE-HEALTH', spec: '§4、§19',
      message: '健康／死亡主題唔准出方向評級 —— grade 要係 null' });
  }

  // §18.6：事要綁證據同條件
  for (const s of o.shi_scenarios) {
    if (!s.evidence_ids.every((id) => o.evidence.some((e) => e.id === id))) {
      out.push({ level: 'error', code: 'GATE-EVIDENCE', field: 'shi_scenarios',
        message: `情境引用咗唔存在嘅 evidence id：${s.evidence_ids.join(', ')}` });
    }
  }

  // §17：空 list 要有說明
  if (o.counter_ids.length === 0 && !o.evidence_check_note) {
    out.push({ level: 'error', code: 'GATE-COUNTER', spec: '§14',
      message: '冇反證就要寫檢查說明 —— 「未見反證」唔等於「已檢查過」' });
  }

  return out;
}

export const hasError = (fs: Finding[]) => fs.some((f) => f.level === 'error');
