import { annual, cast, type BirthInput, type Chart, type ShichenIndex } from '@guanwei/ziwei';
import { lookBackEvent } from './daxian';

/* ───────────────────────────────────────────────────────────
 * 定時辰（2026-10-05 · 模擬階段）
 *
 * 唔知時辰嘅人：十二個時辰各排一個盤（候選），問佢過去幾年發生過乜，
 * 睇邊個候選嘅「預測」同答案最吻合。
 *
 * ⚠ 《深造講義》冇講定時辰（搵過，冇）。方法係我哋自己嘅：用書嘅讀法（流年四化落邊宮、
 *   大限幾時換、回看過去嘅條件）做每個候選嘅預測，再用貝氏更新揀。
 * ⚠ 呢度只係預測同計分，唔決定收唔收錢、幾有把握先出書 —— 嗰啲由模擬結果決定。
 * ─────────────────────────────────────────────────────────── */

export type HourCandidate = { shichen: ShichenIndex; chart: Chart };

/** 唔知時辰：十二個時辰各排一個盤。排唔到嘅（例如年份超出範圍）跳過。 */
export function candidates(input: Omit<BirthInput, 'time'>, only?: readonly ShichenIndex[]): HourCandidate[] {
  const all = (only ?? ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as ShichenIndex[])).map((shichen) => {
    const r = cast({ ...input, time: { shichen } });
    return r.ok ? { shichen, chart: r.value } : null;
  });
  return all.filter((c): c is HourCandidate => c !== null);
}

/** 問題：某一年、某方面。`turn` = 「生活重心換咗方向」（換大限）。 */
export type Area = '工作' | '錢' | '感情' | '遷移' | '家' | '身體' | 'turn';
export type Question = { year: number; area: Area };
export const qid = (q: Question) => `${q.year}:${q.area}`;

/* 流年化忌落嗰宮 → 方面。流年層或者大限層其中一層係呢宮都算（疊宮） */
const AREA_OF: Record<string, Exclude<Area, 'turn'>> = {
  官祿: '工作',
  財帛: '錢',
  夫妻: '感情',
  遷移: '遷移',
  田宅: '家',
  疾厄: '身體',
};
const EVENT_AREA: Record<string, Exclude<Area, 'turn'>> = { 身體: '身體', 出行: '遷移', 是非: '工作', 錢: '錢', 感情: '感情' };

/**
 * 一個候選盤喺 [from, to] 每年嘅預測：邊幾方面「有事」。
 * 回 Map<qid, true>；冇入 Map 嘅就係預測「冇特別」。
 */
export function predictions(chart: Chart, from: number, to: number): Set<string> {
  const out = new Set<string>();
  for (let y = from; y <= to; y++) {
    const r = annual(chart, y);
    if (!r.ok) continue;
    const A = r.value;
    if (chart.decadals.some((d) => d.fromAge === A.nominalAge)) out.add(qid({ year: y, area: 'turn' }));
    const ji = A.sihua.annual.find((h) => h.hua === '忌');
    for (const name of [ji?.annualPalace, ji?.decadalPalace]) {
      const a = name ? AREA_OF[name] : undefined;
      if (a) out.add(qid({ year: y, area: a }));
    }
    const ev = lookBackEvent(chart, A);
    if (ev) out.add(qid({ year: y, area: EVENT_AREA[ev.kind]! }));
  }
  return out;
}

/** 答案：有、冇、唔記得（唔記得就唔計）。 */
export type Answer = 'yes' | 'no' | 'unsure';

/**
 * 計分模型：預測「有事」嗰年，人答「有」嘅機會係 `hit`；預測「冇特別」嗰年答「有」係 `base`
 * （大事好普遍，冇預測都有唔少人答有）。
 */
export type Model = { hit: number; base: number };

export function posterior(
  preds: readonly Set<string>[],
  answers: readonly { q: Question; a: Answer }[],
  m: Model,
  prior?: readonly number[],
): number[] {
  let w = preds.map((_, i) => Math.log(prior?.[i] ?? 1));
  for (const { q, a } of answers) {
    if (a === 'unsure') continue;
    const id = qid(q);
    w = w.map((x, i) => {
      const p = preds[i]!.has(id) ? m.hit : m.base;
      return x + Math.log(a === 'yes' ? p : 1 - p);
    });
  }
  const top = Math.max(...w);
  const e = w.map((x) => Math.exp(x - top));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

const entropy = (p: readonly number[]) => -p.reduce((s, x) => (x > 0 ? s + x * Math.log2(x) : s), 0);

/**
 * 下一條問乜：預期資訊增益最大嗰條（喺候選之間分得最開）。
 * 只揀有候選預測「有事」嘅題，而且唔重複。
 */
export function nextQuestion(
  preds: readonly Set<string>[],
  post: readonly number[],
  asked: ReadonlySet<string>,
  m: Model,
  pool: readonly Question[],
): Question | null {
  let best: Question | null = null;
  let gain = 0;
  const h0 = entropy(post);
  for (const q of pool) {
    const id = qid(q);
    if (asked.has(id)) continue;
    const pYesI = preds.map((s) => (s.has(id) ? m.hit : m.base));
    const pYes = pYesI.reduce((s, p, i) => s + p * post[i]!, 0);
    if (pYes <= 0 || pYes >= 1) continue;
    const postYes = post.map((x, i) => (x * pYesI[i]!) / pYes);
    const postNo = post.map((x, i) => (x * (1 - pYesI[i]!)) / (1 - pYes));
    const g = h0 - (pYes * entropy(postYes) + (1 - pYes) * entropy(postNo));
    if (g > gain) {
      gain = g;
      best = q;
    }
  }
  return best;
}

/** 題庫：所有候選預測過「有事」嘅年份 × 方面。 */
export function questionPool(preds: readonly Set<string>[]): Question[] {
  const ids = new Set(preds.flatMap((s) => [...s]));
  return [...ids].map((id) => {
    const [y, area] = id.split(':') as [string, Area];
    return { year: Number(y), area };
  });
}

/** 計分模型（模擬用嘅樂觀假設；真人驗證之後再用數據校準）。 */
export const RECTIFY_MODEL: Model = { hit: 0.75, base: 0.3 };

/** 大概時段：0 夜（子丑寅，23–5 時）、1 朝（卯辰巳，5–11 時）、2 晝（午未申，11–17 時）、3 晚（酉戌亥，17–23 時） */
export const BANDS: readonly (readonly ShichenIndex[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
];

const ASK: Record<Area, string> = {
  工作: '工作上有沒有大變動或特別吃力，例如轉工、換上司、手上的事推倒重來？',
  錢: '錢方面有沒有特別吃緊，例如一筆大開支、收入不穩，或者錢借出去收不回？',
  感情: '感情上有沒有波折，例如吵得多、聚少離多，或者一段關係要做決定？',
  遷移: '有沒有搬到新的地方、常要出差，或者出行上有波折？',
  家: '家裡有沒有大變動，例如搬屋、裝修，或者家裡有事要你分心？',
  身體: '身體上有沒有特別辛苦，要停下來休養一段時間？',
  turn: '生活的重心有沒有轉方向，例如升學、出來工作、轉行或成家？',
};

/* 英文（2026-10-05 · 英文閱讀模式）：同中文一樣嘅例子；歲數跟詞彙表寫實歲 */
const ASK_EN: Record<Area, string> = {
  工作: 'Was there a big change or an especially hard stretch at work, such as changing jobs, getting a new boss, or a project being scrapped and started again?',
  錢: 'Was money especially tight, such as a big expense, unsteady income, or money you lent that never came back?',
  感情: 'Were there ups and downs in love, such as more arguments, long spells apart, or a relationship reaching the point of a decision?',
  遷移: 'Did you move somewhere new, travel a lot for work, or run into setbacks while travelling?',
  家: 'Was there a big change at home, such as moving house, renovating, or family matters that needed your attention?',
  身體: 'Was it a physically demanding time, when you had to stop and rest for a while?',
  turn: 'Did the centre of your life shift, such as going on to further study, starting work, changing career or starting a family?',
};

/** 一條問題嘅字：「二〇一四年前後（你虛歲二十五）：工作上有沒有⋯？」年份用阿拉伯數字，方便試用者對。 */
export function questionText(q: Question, lunarBirthYear: number, lang: 'zh' | 'en' = 'zh'): string {
  const nominal = q.year - lunarBirthYear + 1;
  if (lang === 'en') return `Around ${q.year} (when you were ${nominal - 2} or ${nominal - 1}): ${ASK_EN[q.area]}`;
  return `${q.year} 年前後（你虛歲 ${nominal}）：${ASK[q.area]}`;
}
