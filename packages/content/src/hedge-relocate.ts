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
 *
 * v3（2026-10-27 自評五本）：有啲句連「據」都唔應該留，直接刪：
 *   編輯口吻：講本章做咗乜、唔做乜（「本章不推」「未作個人判斷」「編輯對照」「替讀者」）。
 *   淨列分支：冇「你」，只講原書另有修飾、前提、例外，或者只講唔可以點推。
 *   盤上冇嘅火鈴：本宮三方四正冇火星、鈴星，提到火鈴嘅句唔出（由 `absent` 傳入）。
 *   v5：冇「你」又點名本宮四方加左右夾宮都冇嘅星（`absent.stars`），一樣唔出；句子自己講明本盤冇就留。
 * 建議同判斷句照舊唔郁。
 */
const META = /另核|未齊|待核|閱讀方法|閱讀說明|不是另一條命理判斷|合讀|另列待/;
const SPLIT = /分開(?!記|安排|確認|存|放|開支|使用)|兩個層次|各有(?:不同|自己|各自)|另作區分|不能混(?:用|入|為)|並非同一|不是同一種|各自條件|各自展開|一層[^。；]{0,40}另一層|原書(?:明)?分(?!析)|原書(?:把|將)[^。；]{0,40}分(?:開|作|為|列)/;
/** 緊跟被搬句、指涉佢嘅附屬句（同 withConditionalBranches 一樣） */
const DEPENDENT = /^(這些|此處|這一項|這幾種|這幾項|這兩種|上述|它|兩者)/;
const ADVICE = new Set<MingStatement['kind']>(['editorial-advice', 'editorial-example']);
const VERDICT = /^(plain|pair|(?:ming|health)\.verdict)\./;

const EDITOR = /本章|這章|這裡(?:不|先|只|有延續)|讀者|替你(?:定|決定|作|認定|選)|替人(?:認定|定|判|作|評定)|定類|定性|判決|診斷|個人判斷|判讀角度|編輯(?:對照|例子|觀察|導航)|星系比較|位置資料|未用顆數|未據此|另行確認|各自核對|[須要]核|核清|核齊|尚未(?:判明|逐項)|未(?:完整|逐項)|條件支|有疑義|必須看本宮|這項修飾|不保證|不預告|(?<!規)勸你|一律勸|不推|不作(?:突然|情緒|個人)|不表示你|放到你身上|原文中分作|須看究竟|各有分別|各有側重|自動(?:判定|成格)|[須要]看相鄰|未在這裡|列出不同|不完全相同|改變(?:原書描述的重點|理解)|原書按[^。；，]{0,30}分(?!析|述)|(?:要求|作用|性|描述|對宮|結構)(?:也|亦)?不同[。；]?$/;
const METHOD = /原書|分支|修飾|前提|條件|格局|格名|夾|廟陷|日夜|宮支|四化|吉化|化祿|化忌|化科|化權|煞|吉曜|輔佐|借入|借星|一支|配合|星名/;
const ONLY_NOT = /不能|不等於|不代表|未必|不以|不把|不必然|不一定/;
const BRANCH = /分支|修飾|前提|例外/;
const BRANCH_HOW = /另|要求|明列|列出|仍(?:要|須|需)|須|才(?:談|能|有)|不能|未必|保留/;
/** 連「據」都唔留嘅句：編輯口吻、冇「你」嘅淨列分支／淨講唔可以點。 */
export function isEditorNote(sentence: string, kind?: MingStatement['kind']): boolean {
  if (ADVICE.has(kind)) return false;
  if (EDITOR.test(sentence)) return true;
  if (sentence.includes('你')) return false;
  // 「原書明說／亦說…未必…」係原書實際講法，唔當兜圈；有「不能」就係講推法，照刪
  if (ONLY_NOT.test(sentence) && METHOD.test(sentence) && !(/明說|亦說/.test(sentence) && !/不能/.test(sentence))) return true;
  return BRANCH.test(sentence) && BRANCH_HOW.test(sentence);
}
const FIRE_BELL = /火鈴|火星|鈴星|火貪|鈴貪|火、鈴/;
/** 句尾「，這屬編輯例子」之類嘅說明，刪尾留句。 */
const EDITOR_TAIL = /，這屬編輯(?:例子|觀察|對照)(?=[。；]$)/;

export function isRelocatableHedge(sentence: string, kind?: MingStatement['kind']): boolean {
  if (META.test(sentence)) return true;
  return !ADVICE.has(kind) && SPLIT.test(sentence);
}

const sentences = (t: string) => t.match(/[^。；！？]*[。；！？]|[^。；！？]+$/g) ?? [];
const union = <T,>(xs: T[]) => [...new Set(xs)];

type Seg = { text: string; statements?: MingStatement[]; referenceConditions?: string[] };
export type HedgeOptions = { editorNotes?: boolean; absent?: { fireBell?: boolean; stars?: readonly string[] } };
/** 句子自己講明本盤冇嗰粒星（好寫法），唔當列條件。同 book-lint A3 一樣。 */
const SAYS_ABSENT = /本盤(?:沒有|未|並無|不)|這張盤(?:未|沒有)|未採用|不套用|不適用/;
/** v5：冇「你」、只係點名本宮四方加夾宮都冇嘅星（原書另一支嘅條件），同火鈴一樣刪。 */
const namesAbsent = (s: string, stars: readonly string[] | undefined) =>
  !!stars?.length && !s.includes('你') && !SAYS_ABSENT.test(s) && stars.some((x) => s.includes(x));

/** 一段：回剩低嘅 statements、搬走嘅句，同有冇刪過句。 */
function split(seg: Seg, opts: HedgeOptions = {}): { statements: MingStatement[]; moved: string[]; cut: boolean } {
  const moved: string[] = [];
  let dropped = false, cut = false, wasCut = false;
  const kept = seg.statements!.map((l) => {
    // 結論判斷句（verdict-lead）係判斷，唔係兜圈句，唔郁
    if (VERDICT.test(l.source_ids[0] ?? '')) { dropped = wasCut = false; return l; }
    const out: string[] = [];
    for (const raw of sentences(l.text)) {
      const s = opts.editorNotes ? raw.replace(EDITOR_TAIL, '') : raw;
      if (s !== raw) cut = true;
      // 附屬句跟前一句：前句刪就刪，前句搬就搬
      const follows = dropped && DEPENDENT.test(s);
      if ((follows && wasCut) || (opts.editorNotes && (isEditorNote(s, l.kind) || ((opts.absent?.fireBell && FIRE_BELL.test(s)) || namesAbsent(s, opts.absent?.stars)) && !ADVICE.has(l.kind)))) { cut = wasCut = dropped = true; continue; }
      if (follows || isRelocatableHedge(s, l.kind)) { moved.push(s.replace(/；$/, '。')); dropped = true; wasCut = false; continue; }
      out.push(s); dropped = wasCut = false;
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
  return { statements, moved, cut };
}

export function withRelocatedHedges<T extends Seg>(segments: T[], opts: HedgeOptions = {}): T[] {
  const rows: (T | null)[] = [];
  const folded: { seg: T; citations: string[]; conditions: string[]; at: number }[] = [];
  segments.forEach((seg, i) => {
    if (!seg.statements?.length) { rows.push(seg); return; }
    const { statements, moved, cut } = split(seg, opts);
    if (!moved.length && !cut) { rows.push(seg); return; }
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
      const next = split({ ...seg, statements: [l] }, opts).statements[0]?.text ?? '';
      if (next !== l.text) text = text.replace(l.text, next);
    }
    rows.push({ ...seg, text, statements, ...(conditions.length ? { referenceConditions: conditions } : {}) });
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
