import type { MingStatement } from './ming-writer';

/*
 * 判斷唔到嘅分支句搬去「據」（2026-10-27，盲評「結論只係分開看」）
 *
 * 原書好多段落係列分支：「原書分X與Y」「兩個層次」「各有不同前提」。盤面資料唔夠揀邊條時，
 * 呢類句留喺正文，讀者讀到嘅係方法論，唔係判斷。新書而家將佢哋由正文移去該段嘅 referenceConditions：
 * 識斗數嘅讀者打開「據」仲睇得到，出處亦唔少。
 *
 *   搬：編輯筆記（另核、未齊、閱讀方法…）；同埋只講分開、只講分支嘅句。
 *   唔搬：「分開記下／分開安排」呢類具體做法；建議（editorial-advice）同例子入面嘅分開句；
 *         「不等於」「未必」呢類否定（佢哋多數黐住一個判斷，留畀第三步改寫）。
 *   一段搬完冇字：段落唔出，佢嘅出處同條件併入前面（冇就後面）有出處嘅一段，同 palaceNarrative 摺範圍段一樣。
 * 只入新成書入口（createBookChapters `relocateHedges`）；基準入口同舊書快照唔變。
 */
const META = /另核|未齊|待核|閱讀方法|閱讀說明|不是另一條命理判斷|合讀|另列待/;
const SPLIT = /分開(?!記|安排|確認|存|放|開支|使用)|兩個層次|各有(?:不同|自己|各自)|另作區分|不能混(?:用|入|為)|並非同一|不是同一種|各自條件|各自展開|原書(?:明)?分(?!析)|原書(?:把|將)[^。；]{0,40}分(?:開|作|為|列)/;
/** 緊跟被搬句、指涉佢嘅附屬句（同 withConditionalBranches 一樣） */
const DEPENDENT = /^(這些|此處|這一項|這幾種|這幾項|這兩種|上述|它|兩者)/;
const ADVICE = new Set<MingStatement['kind']>(['editorial-advice', 'editorial-example']);

export function isRelocatableHedge(sentence: string, kind?: MingStatement['kind']): boolean {
  if (META.test(sentence)) return true;
  return !ADVICE.has(kind) && SPLIT.test(sentence);
}

const sentences = (t: string) => t.match(/[^。；！？]*[。；！？]|[^。；！？]+$/g) ?? [];
const union = <T,>(xs: T[]) => [...new Set(xs)];

type Seg = { text: string; statements?: MingStatement[]; referenceConditions?: string[] };

/** 一段：回剩低嘅 statements 同搬走嘅句。 */
function split(seg: Seg): { statements: MingStatement[]; moved: string[] } {
  const moved: string[] = [];
  let dropped = false;
  const kept = seg.statements!.map((l) => {
    const out: string[] = [];
    for (const s of sentences(l.text)) {
      if (isRelocatableHedge(s, l.kind) || (dropped && DEPENDENT.test(s))) { moved.push(s.replace(/；$/, '。')); dropped = true; continue; }
      out.push(s); dropped = false;
    }
    const text = out.join('');
    return { ...l, text: text.endsWith('；') ? `${text.slice(0, -1)}。` : text };
  });
  // 冇字嘅 statement 唔出，佢嘅出處併去同段最近一條仲有字嘅
  const statements: MingStatement[] = [];
  let orphan: string[] = [];
  for (const l of kept) {
    if (!l.text) { orphan.push(...l.citations); continue; }
    statements.push(orphan.length ? { ...l, citations: union([...orphan, ...l.citations]) } : l);
    orphan = [];
  }
  if (orphan.length && statements.length) {
    const last = statements.at(-1)!;
    statements[statements.length - 1] = { ...last, citations: union([...last.citations, ...orphan]) };
  }
  return { statements, moved };
}

export function withRelocatedHedges<T extends Seg>(segments: T[]): T[] {
  const rows: (T | null)[] = [];
  const folded: { seg: T; citations: string[]; conditions: string[]; at: number }[] = [];
  segments.forEach((seg, i) => {
    if (!seg.statements?.length) { rows.push(seg); return; }
    const { statements, moved } = split(seg);
    if (!moved.length) { rows.push(seg); return; }
    const conditions = union([...(seg.referenceConditions ?? []), ...moved]);
    if (!statements.length) {
      folded.push({ seg, citations: seg.statements.flatMap((l) => l.citations), conditions, at: i });
      rows.push(null);
      return;
    }
    // 段文逐條替換，唔假設段文一定等於 statements 串埋
    let text = seg.text;
    if (text === seg.statements.map((l) => l.text).join('')) text = statements.map((l) => l.text).join('');
    else for (const [j, l] of seg.statements.entries()) {
      const next = split({ ...seg, statements: [l] }).statements[0]?.text ?? '';
      if (next !== l.text) text = text.replace(l.text, next);
    }
    rows.push({ ...seg, text, statements, referenceConditions: conditions });
  });
  for (const f of folded) {
    const cited = (k: number) => rows[k]?.statements?.some((l) => l.citations.length) ?? false;
    let k = -1;
    for (let j = f.at - 1; j >= 0 && k < 0; j--) if (cited(j)) k = j;
    for (let j = f.at + 1; j < rows.length && k < 0; j++) if (cited(j)) k = j;
    if (k < 0) { if (f.citations.length) rows[f.at] = f.seg; continue; } // 冇段可以併：有出處就照舊留低，唔好丟咗出處
    const target = rows[k]!;
    const statements = target.statements!;
    const index = statements.findIndex((l) => l.citations.length);
    rows[k] = { ...target, statements: statements.map((l, j) => j === index ? { ...l, citations: union([...l.citations, ...f.citations]) } : l),
      referenceConditions: union([...(target.referenceConditions ?? []), ...f.conditions]) };
  }
  return rows.filter((r): r is T => r !== null);
}
