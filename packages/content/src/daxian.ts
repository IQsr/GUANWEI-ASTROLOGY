import { z } from 'zod';
import { annual, sanFangPalaces, sihuaOfStem, tianxingBranch, type AnnualChart, type Branch, type Chart, type Palace, type Sihua } from '@guanwei/ziwei';
import huaRaw from './daxian/hua.json';
import rulesRaw from './daxian/rules.json';
import pivotsRaw from './daxian/pivots.json';
import eventsRaw from './daxian/events.json';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';
import { AREA, palaceLabel } from './link';
import { FORBIDDEN_TERMS } from './frame';
import { leanOf, xingxiOf } from './xingxi';
import { palacePlain } from './palace-plain';

/* ───────────────────────────────────────────────────────────
 * 大限兩章（2026-09-30 · Issac：先做大限，參考書）
 *
 *   一生十二步（免費）  十二個大限，每步一行：幾歲、落邊宮、坐乜星；寫書嗰陣行到邊步
 *   這十年（收費）      寫書嗰陣行緊嗰個大限，詳細講；順帶預告下一個
 *
 * ── 讀法跟《深造講義》──
 *
 * 一、大限嗰個宮就係呢十年嘅命宮，讀法同本命命宮一樣（p.10「無論推斷天盤命宮，抑或運限的命宮」）。
 *     所以大限命宮套用六十星系，用大限四化判斷偏向。
 * 二、大限四化由大限宮干引出，落喺呢十年嘅邊一宮（p.235 例子講「大運事業宮」「大運財帛宮」）。
 *     每粒星化乜嘅意思出自 p.238–313 逐星逐化嗰段（`daxian/hua.json`）。
 * 三、本命四化係本質，大限四化係嗰段時期嘅環境；兩者碰到先起作用（p.235–237，`daxian/rules.json`）。
 *
 * ⚠ 書入面冇「大限落本命某宮 = 呢十年重心喺嗰方面」嘅講法，所以唔用。
 * ⚠ 唔預測事件、唔講病、唔講金額；本書寫咗唔變（R-008），寫「寫這本書時」唔寫「現在」。
 * ─────────────────────────────────────────────────────────── */

const Source = z.object({ corpus: z.literal('zhongzhou'), passage_id: z.string(), quote: z.string().min(4).max(24) });

function checkLine(id: string, text: string, src: z.infer<typeof Source>, ctx: z.RefinementCtx) {
  const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${id}：${m}` });
  const p = CORPUS[src.corpus]?.passages[src.passage_id];
  if (!p) issue(`語料庫搵唔到 ${src.passage_id}`);
  else if (!normaliseForMatch(p.text).includes(normaliseForMatch(src.quote))) issue(`引文「${src.quote}」唔喺原文`);
  const w = cjkCount(text);
  if (w < 15 || w > 60) issue(`${w} 字，要 15–60`);
  for (const f of [...scanForbidden(text, 'body'), ...scanPlain(text, 'body')]) issue(`${f.code} ${f.message}`);
}

/*
 * `areas`（2026-10-04）：句子講緊邊方面。四方面段落（`areaSegments`）只會用講緊嗰方面嘅句，
 * 例如天同化祿嘅句講錢，落喺心境就唔用佢 —— 改用嗰方面嘅通用句，星嘅句留返去四化段。
 */
const AreaSlot = z.enum(['工作', '錢', '感情', '心境']);

const Hua = z
  .object({ id: z.string(), star: z.string(), hua: z.enum(['祿', '權', '科', '忌']), text: z.string(), areas: z.array(AreaSlot).min(1), source: Source })
  .superRefine((x, ctx) => {
    checkLine(x.id, x.text, x.source, ctx);
    if (!x.text.startsWith('你')) ctx.addIssue({ code: 'custom', message: `${x.id}：要對住讀者講（「你⋯」開頭）` });
  });

const Rule = z
  .object({ id: z.string(), natal: z.enum(['祿', '權', '科', '忌']), decade: z.enum(['祿', '權', '科', '忌']), text: z.string(), source: Source })
  .superRefine((x, ctx) => checkLine(x.id, x.text.replace('{star}', '某星'), x.source, ctx));

const RulesDoc = z.object({
  rules: z.array(Rule),
  none: z.object({ id: z.string(), text: z.string(), source: Source }).superRefine((x, ctx) => checkLine(x.id, x.text.slice(0, 60), x.source, ctx)),
});

export const DAXIAN_HUA = z.array(Hua).parse(huaRaw);

/*
 * 回看過去：身體、出行、是非、錢（2026-10-04，Issac：試讀嘅人最在意「講中過去」）
 *
 * 條件全部跟《深造講義》（`daxian/events.json`，每條帶原文同頁數）。只講過去年份，寫法婉轉：
 * 唔講病名、手術、死傷、官非、破財呢啲字，只講「身體要付出的多」「出入要小心」⋯
 * ⚠ 唔用喺將來嘅年份（這一年、這十年）：講過去係印證，講將來係嚇人。
 */
const Event = z
  .object({ id: z.string(), kind: z.enum(['身體', '出行', '是非', '錢']), text: z.string(), rule: z.string(), sources: z.array(Source).min(1) })
  .superRefine((x, ctx) => x.sources.forEach((src) => checkLine(x.id, x.text, src, ctx)));
export const LOOKBACK_EVENTS = z.array(Event).parse(eventsRaw);

/**
 * 樞紐大限（2026-09-30）：《深造講義》下篇宮垣論・命宮（p.336–366）
 * 「X守命，以Y宮垣為大限／大運／命運的樞紐」—— 行到嗰幾步，吉凶影響一生特別大（p.339）。
 * 只收大限相關；淨係流年、年限嘅留畀流年章。條件：順逆行、命宮見唔見煞、丙年、天相獨坐睇四化。
 */
const STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍', '文昌', '文曲'];
const Pivot = z
  .object({
    id: z.string(),
    /** decade = 大限樞紐；year = 流年／年限樞紐；both = 原文講「大運流年」或者冇分 */
    scope: z.enum(['decade', 'year', 'both']),
    ming: z.array(z.string()).min(1),
    branches: z.array(z.string()).nullable(),
    cond: z.enum(['forward', 'backward', 'sha', 'nosha', 'stem:丙', 'notstem:丙', 'hua']).nullable(),
    pivots: z.array(z.array(z.string()).min(1)),
    source: Source,
  })
  .superRefine((x, ctx) => {
    const p = CORPUS[x.source.corpus]?.passages[x.source.passage_id];
    if (!p || !normaliseForMatch(p.text).includes(normaliseForMatch(x.source.quote))) {
      ctx.addIssue({ code: 'custom', message: `${x.id}：引文「${x.source.quote}」唔喺原文` });
    }
    for (const s of [...x.ming, ...x.pivots.flat()]) {
      if (!STARS.includes(s)) ctx.addIssue({ code: 'custom', message: `${x.id}：唔認得「${s}」` });
    }
    if (x.cond !== 'hua' && x.pivots.length === 0) ctx.addIssue({ code: 'custom', message: `${x.id}：冇樞紐` });
  });
export const DAXIAN_PIVOTS = z.array(Pivot).parse(pivotsRaw);

const SHA4 = ['擎羊', '陀羅', '火星', '鈴星'];

/**
 * 呢張盤嘅樞紐規則（大限或流年）：回一個「呢個宮係咪樞紐」嘅判斷。冇資料就回 null。
 */
export function pivotRule(
  chart: Chart,
  scope: 'decade' | 'year',
): { isPivot: (p: Palace) => boolean; source: string } | null {
  const ming = chart.palaces.find((p) => p.name === '命宮');
  if (!ming || chart.decadals.length < 2) return null;
  let stars = majors(ming);
  let branch = ming.branch as string;
  if (stars.length === 0 && ming.borrowsFrom) {
    const opp = chart.palaces.find((p) => p.branch === ming.borrowsFrom);
    stars = opp ? majors(opp) : [];
    branch = ming.borrowsFrom;
  }
  const key = [...stars].sort().join('·');
  const b0 = chart.palaces.findIndex((p) => p.branch === chart.decadals[0]!.branch);
  const b1 = chart.palaces.findIndex((p) => p.branch === chart.decadals[1]!.branch);
  const forward = (b1 - b0 + 12) % 12 === 1;
  const sha = sanFangPalaces(chart.palaces, ming.branch).some((p) => p.stars.some((s) => SHA4.includes(s.name)));
  const stem = chart.ganzhi.year[0];
  const ok = (c: (typeof DAXIAN_PIVOTS)[number]['cond']) =>
    c === null || c === 'hua' ||
    (c === 'forward' && forward) || (c === 'backward' && !forward) ||
    (c === 'sha' && sha) || (c === 'nosha' && !sha) ||
    (c === 'stem:丙' && stem === '丙') || (c === 'notstem:丙' && stem !== '丙');
  const rule = DAXIAN_PIVOTS.find(
    (r) =>
      (r.scope === scope || r.scope === 'both') &&
      [...r.ming].sort().join('·') === key &&
      (!r.branches || r.branches.includes(branch)) &&
      ok(r.cond),
  );
  if (!rule) return null;
  const names = (p: Palace) => p.stars.filter((s) => s.kind === 'major' || s.name === '文昌' || s.name === '文曲').map((s) => s.name);
  const isPivot = (p: Palace) =>
    rule.cond === 'hua' ? p.stars.some((s) => s.sihua) : rule.pivots.some((g) => g.every((s) => names(p).includes(s)));
  return { isPivot, source: rule.source.passage_id };
}

/** 呢張盤邊幾步大限係樞紐。冇資料（書冇講嗰組命宮星）就回空。 */
export function pivotSteps(chart: Chart): { steps: number[]; source: string | null } {
  const r = pivotRule(chart, 'decade');
  if (!r) return { steps: [], source: null };
  const steps = chart.decadals.filter((d) => r.isPivot(chart.palaces.find((x) => x.branch === d.branch)!)).map((d) => d.index);
  return { steps, source: r.source };
}
export const DAXIAN_RULES = RulesDoc.parse(rulesRaw);

/* 章框（冇來源，唔准讀象） */
export const DAXIAN_FRAMES = {
  stepsClose: '十二步是一條路的形狀，走得快慢、走向哪裡，仍然在你；關鍵的幾步，值得提早準備。',
  decadeClose: '環境只是背景；這十年要做成甚麼、做到哪一步，始終由你自己決定。',
} as const;
for (const t of Object.values(DAXIAN_FRAMES)) {
  const bad = FORBIDDEN_TERMS.filter((w) => t.includes(w));
  if (bad.length) throw new Error(`大限章框唔准講命理：${bad.join('、')}`);
}

export const STEPS_SLUG = '一生十二步';
export const DECADE_SLUG = '這十年';

export type DaxianSegment = { slot: string; text: string; source_id: string | null; rule_ids: string[] };
type Out = { slug: string; title: string; segments: DaxianSegment[] } | null;

const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
export function num(n: number): string {
  if (n >= 100) {
    const r = n % 100;
    return `一百${r === 0 ? '' : r < 10 ? `零${DIGITS[r]}` : num(r)}`;
  }
  if (n < 10) return DIGITS[n]!;
  if (n < 20) return `十${n % 10 ? DIGITS[n % 10] : ''}`;
  return `${DIGITS[Math.floor(n / 10)]}十${n % 10 ? DIGITS[n % 10] : ''}`;
}
export const yearCN = (y: number) => [...String(y)].map((d) => DIGITS[Number(d)]).join('');

const majors = (p: Palace) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
export function starsOf(chart: Chart, p: Palace): string {
  const own = majors(p);
  if (own.length) return `坐${own.join('、')}`;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  const b = opp ? majors(opp) : [];
  return b.length ? `沒有主星，借對宮的${b.join('、')}` : '沒有主星';
}
export const area = (palace: string | null) => (palace ? (AREA[palace]?.[0] ?? palaceLabel(palace)) : '');

/* ── 分四方面讀一段時期（2026-10-02）───────────────────────
 *
 * 《深造講義》讀運限，係將大限／流年嗰盤嘅宮當本命咁讀：「大運事業宮」「大運財帛宮」「流年夫妻宮」
 * （p.235、p.440 嘅例子）。所以呢段時期嘅工作、錢、感情、心境，就睇嗰盤嘅官祿、財帛、夫妻、福德
 * 坐乜星（用嗰粒星喺嗰類宮嘅結論句），同埋呢段時期嘅四化有冇落入去。
 *
 * ⚠ p.440 寫明「不可一見大運財帛宮的煞忌，便立刻武斷為財帛不佳」—— 化忌只講「要多留神」，唔講衰。
 * ⚠ 唔講「大限落本命某宮＝重心」：書入面冇呢個講法。
 */
export const AREAS = [
  { palace: '官祿', slot: '工作', says: /做事|工作/ },
  { palace: '財帛', slot: '錢', says: /錢|資源|財/ },
  { palace: '夫妻', slot: '感情', says: /感情|親密|伴侶/ },
  { palace: '福德', slot: '心境', says: /安定|安心|心境/ },
] as const;

const TONE: Record<Sihua, string> = {
  祿: '比較順',
  權: '有發揮的空間，也要多扛一點',
  科: '容易得到認可',
  忌: '要多留神',
};

/*
 * 四化落入某方面、但嗰粒星嘅句講緊另一方面時用嘅通用句（2026-10-04）。
 * 只講「呢方面會點」，唔講星名、唔講化乜（括號嘅依據已經講咗）。化忌照 p.440 只講留神，唔講衰。
 */
export const AREA_HUA: Record<(typeof AREAS)[number]['slot'], Record<Sihua, string>> = {
  工作: {
    祿: '工作上容易遇到合適的機會，肯主動爭取，比較容易做出成績。',
    權: '工作上你會多一點話事權，責任也跟著加重；不是每件事都要自己扛。',
    科: '你在工作上的表現容易被看見，適合爭取認可、考證或建立口碑。',
    忌: '工作上的計劃容易卡住或要返工，重要的決定先留一點餘地。',
  },
  錢: {
    祿: '收入有增加的機會，進賬比較順；順的時候也記得留一份。',
    權: '錢怎樣用多由你作主，可以主動規劃，但別一次押得太重。',
    科: '你在錢上信用好，借貸、合作都容易得到別人信任。',
    忌: '錢容易周轉緊或超出預算，大額支出和借貸先多想一步。',
  },
  感情: {
    祿: '感情上比較甜，容易遇到合拍的人，或和伴侶相處更融洽。',
    權: '感情裡你比較主導，記得留空間給對方，別變成一個人作主。',
    科: '感情上相處有禮，你們的關係容易得到身邊的人認同。',
    忌: '感情上容易有誤會，或有心事說不出口；有話早點講清楚。',
  },
  心境: {
    祿: '你的心情比較寬鬆，懂得享受生活，也較容易感到滿足。',
    權: '你心裡想做的事多，幹勁也足，但容易給自己太大壓力。',
    科: '你容易找到讓自己靜下來的方法，讀書和修養都合適，靜下來時想得特別清楚。',
    忌: '你心裡容易有放不下的事，多思多慮；記得給自己留出休息的時間。',
  },
};
for (const [slot, lines] of Object.entries(AREA_HUA)) {
  for (const [hua, text] of Object.entries(lines)) {
    const bad = [...scanForbidden(text, 'body'), ...scanPlain(text, 'body')];
    if (bad.length) throw new Error(`AREA_HUA ${slot}.${hua}：${bad.map((f) => `${f.code} ${f.message}`).join('；')}`);
  }
}

export type PeriodHit = { star: string; hua: Sihua; palace: string | null };

/**
 * 一段時期分四方面嘅段落。`nameAt(branch)` = 呢段時期嘅盤入面，嗰個地支叫乜宮。
 * 回嘅 `used` = 已經喺四方面講咗嘅四化（四化段唔使再講一次）。
 */
export function areaSegments(
  chart: Chart,
  nameAt: (branch: string) => string | null,
  hits: readonly PeriodHit[],
  scope: '這十年' | '這一年',
): { segments: DaxianSegment[]; used: Set<string> } {
  const used = new Set<string>();
  const segments: DaxianSegment[] = [];
  for (const a of AREAS) {
    const p = chart.palaces.find((x) => nameAt(x.branch) === a.palace);
    if (!p) continue;
    const own = majors(p);
    const opp = own.length === 0 && p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
    const lead = (own[0] ?? (opp ? majors(opp)[0] : undefined)) as string | undefined;
    const pp = lead ? palacePlain(lead, a.palace) : undefined;
    if (!pp) continue;
    const here = hits.filter((h) => h.palace === a.palace);
    const label = AREA[a.palace]![1];
    /* 化祿化忌同落一格：唔揀邊個，照講有得有失 */
    const tones = [...new Set(here.map((h) => TONE[h.hua]))];
    /*
     * 開頭點寫：
     *   有順／要留神 —— 一定講明係邊方面（「感情上，這十年要多留神。」）
     *   冇，而結論句自己已經講明係邊方面（「你在感情裡⋯」）—— 唔再加「感情上」，唔好講兩次
     */
    const says = a.says.test(pp.summary.slice(0, 8));
    /* 「要留意的是：」一本書已經出二十幾次（每宮結論都有），呢度改講「只是」 */
    const watch = pp.watch.replace(/^要留意的是：/, '只是');
    const head = tones.length
      ? `${label}，${scope}${tones.join('，也')}。${pp.summary}${watch}`
      : says
        ? `${scope}，${pp.summary}${watch}`
        : `${label}，${scope}${pp.summary}${watch}`;
    const layer = scope === '這十年' ? '大限' : '流年';
    const fact = `（依據：${layer}的${a.palace}宮${starsOf(chart, p)}${here.length ? `；${here.map((h) => `${h.star}化${h.hua}`).join('、')}落在這裡` : ''}。）`;
    /*
     * 星嘅句講緊呢方面先用（記入 `used`，四化段唔再講）；講緊別方面就用呢方面嘅通用句，
     * 星嘅句留畀四化段。同一種化只出一句通用句。
     */
    const fits = here
      .map((h) => DAXIAN_HUA.find((e) => e.star === h.star && e.hua === h.hua))
      .filter((m): m is NonNullable<typeof m> => Boolean(m) && m!.areas.includes(a.slot));
    fits.forEach((m) => used.add(`${m.star}${m.hua}`));
    const generic = [...new Set(here.filter((h) => !fits.some((m) => m.star === h.star && m.hua === h.hua)).map((h) => h.hua))];
    const huaText = fits.map((m) => m.text).join('') + generic.map((hua) => AREA_HUA[a.slot][hua]).join('');
    segments.push({
      slot: a.slot,
      text: head + fact + huaText,
      source_id: [pp.id, ...fits.map((m) => m.id)].join('+'),
      rule_ids: [],
    });
  }
  return { segments, used };
}

/** 呢段時期最值得做嘅事：力氣放喺化祿嗰方面，化忌嗰方面嘅決定慢一步。 */
export function adviceSegment(hits: readonly PeriodHit[], scope: '這十年' | '這一年'): DaxianSegment | null {
  const lu = hits.find((h) => h.hua === '祿')?.palace ?? null;
  const ji = hits.find((h) => h.hua === '忌')?.palace ?? null;
  if (!lu && !ji) return null;
  const parts: string[] = [];
  if (lu) parts.push(`${area(lu)}方面是${scope}最順的地方，值得多花心思`);
  /* 兩章嘅尾句唔同：給你的話會將兩段排埋一齊 */
  if (ji && ji !== lu) parts.push(`${area(ji)}方面的決定，多花一點時間再定，${scope === '這十年' ? '簽字、承諾之前多問一句' : '急著要答覆的事，先放一晚'}`);
  if (ji && ji === lu) parts.push(`這方面有得著也有牽掛，進一步之前，先想好退路`);
  return { slot: '建議', text: `${scope}最值得做的事：${parts.join('；')}。`, source_id: null, rule_ids: [] };
}

/** 寫書嗰年嘅虛歲同大限。未起運回第一個大限，`started: false`。 */
function decadeAt(chart: Chart, year: number) {
  const a = annual(chart, year);
  if (!a.ok) return null;
  const A = a.value;
  if (A.decadal) return { A, d: A.decadal, started: true as const };
  const first = chart.decadals[0];
  if (!first || A.nominalAge >= first.fromAge) return null;
  const stem = chart.palaces.find((p) => p.branch === first.branch)!.stem;
  return { A, d: { ...first, stem }, started: false as const };
}

/* ── 一生十二步（免費） ─────────────────────────────── */
/* ── 回看過去（2026-10-02 · 免費章）──────────────────────
 *
 * 讀者先喺免費章見到「對得上」嘅過去，之後嘅講法先容易接受（Issac）。
 *
 * ⚠ 唔講事件、唔講病、唔講意外。說服力嚟自「具體」（年份 × 方面，由張盤計出嚟、人人唔同），
 *    唔係嚟自模糊得人人都中嘅暗示 —— 嗰種係巴納姆，`barnum.test.ts` 防嘅就係佢。
 * ⚠ 引擎未有流羊流陀，推唔到事件細節；所以只講「呢方面變動較多／有轉機」。
 *
 * 依據：
 *   一、流年四化係嗰段時期嘅環境（p.235「大運及流年四化所形成的，乃屬各時期的環境」）
 *   二、流年樞紐（下篇宮垣論・命宮，`pivotRule(chart, 'year')`）
 *   三、換大限 —— 新一個大限即係新一段環境
 *
 * 揀年：虛歲十八至去年，訊號最強嘅最多三年，年與年之間最少隔三年，按時間排。
 */
/*
 * 2026-10-04（試讀回饋：「講返之前嗰件事」最深刻，想講得實啲）：
 *   每方面加生活上常見嘅例子（「像是⋯」），年份講死（加干支、唔再寫「前後」），
 *   同一年化祿化忌落唔同方面就兩樣都講。
 * ⚠ 底線照舊：例子只係嗰方面常見嘅樣子，唔講病、意外、官非、離婚、生死（測試攔住）。
 *   疾厄只講作息同疲累，唔講身體出事。
 */
type Area = { gist: string; eg: string };
const JI_AREA: Record<string, Area> = {
  命宮: { gist: '你自己的狀態起伏較大', eg: '像是對自己的方向沒把握，想法反反覆覆' },
  兄弟: { gist: '朋輩之間的事比較費心', eg: '像是和兄弟姊妹、同學或合伙人有爭拗，或者要替他們分擔' },
  夫妻: { gist: '感情上牽掛較多，容易有摩擦', eg: '像是吵得比平時多、聚少離多，或者一段關係走到要做決定的時候' },
  子女: { gist: '後輩或手上的作品比較費心', eg: '像是為子女或下屬操心，或者自己的作品、計劃遲遲未有成果' },
  財帛: { gist: '錢方面支出或周轉比較吃緊', eg: '像是有一筆大開支、收入一時不穩，或者借出去的錢收不回' },
  疾厄: { gist: '身心負荷較重，容易覺得累', eg: '像是長時間加班、作息被打亂，總覺得睡不夠' },
  遷移: { gist: '在外奔走較多，環境變化大', eg: '像是常要出差、搬到新的城市，或者在外面遇到的事不如預期' },
  僕役: { gist: '人際來往比較費心', eg: '像是朋友之間有誤會、被人拖累，或者團隊裡的人事比較麻煩' },
  官祿: { gist: '工作上變動較多，事情不容易照計劃走', eg: '像是轉工、換部門或換上司，或者手上的項目推倒重來' },
  田宅: { gist: '住處或家裡的事變動較多', eg: '像是搬屋、裝修，或者家裡有事要你分心處理' },
  福德: { gist: '心事較多，不容易靜下來', eg: '像是心裡有放不下的事，夜裡想個不停' },
  父母: { gist: '和長輩或上司之間要交代的事較多', eg: '像是和父母意見不合、和上司關係緊張，或者要替長輩處理事情' },
};
const LU_AREA: Record<string, Area> = {
  命宮: { gist: '你自己的狀態比較順', eg: '像是做事特別順手，或者開始了一件後來證明值得的事' },
  兄弟: { gist: '朋輩之間比較得力', eg: '像是得到兄弟姊妹、同學或合伙人幫忙' },
  夫妻: { gist: '感情上比較順', eg: '像是遇到合拍的人、關係穩定下來，或者一起計劃將來' },
  子女: { gist: '後輩或手上的作品有起色', eg: '像是子女或下屬帶來好消息，或者自己的作品有了成果' },
  財帛: { gist: '錢方面有轉機', eg: '像是加薪、有額外收入，或者一筆錢的安排做對了' },
  疾厄: { gist: '身心比較鬆得下來', eg: '像是作息回到正軌，整個人比之前輕鬆' },
  遷移: { gist: '在外的機會較多', eg: '像是出外工作、讀書或旅行帶來機會' },
  僕役: { gist: '人際上有助力', eg: '像是認識到後來幫得上忙的人' },
  官祿: { gist: '工作上有轉機', eg: '像是升職、轉到更合適的工作，或者手上的事得到認可' },
  田宅: { gist: '住處或家裡的事有好的安排', eg: '像是搬到更合適的地方、置業，或者家裡的事安頓下來' },
  福德: { gist: '心境比較安穩', eg: '像是心情安定，有時間做自己喜歡的事' },
  父母: { gist: '和長輩或上司之間比較順', eg: '像是得到長輩或上司提攜' },
};
/** 換大限嗰年：按年紀舉例 */
const turnEg = (age: number) =>
  age <= 24 ? '像是升學、畢業或出來工作' : age <= 40 ? '像是轉工、轉行、搬屋或成家' : '像是工作崗位、住處或家庭角色有了變化';

const NATAL_SHA = ['擎羊', '陀羅', '火星', '鈴星'];

/**
 * 某一年有冇中書入面身體、出行、是非、錢嘅條件（見 `daxian/events.json` 嘅 rule）。
 * 一年最多一樣，次序：身體 → 出行 → 是非 → 錢。
 */
export function lookBackEvent(chart: Chart, A: AnnualChart): (typeof LOOKBACK_EVENTS)[number] | null {
  const xing = tianxingBranch(chart);
  const flows = [A.liuyao.annual, A.liuyao.decadal].filter((f): f is NonNullable<typeof f> => Boolean(f));
  const natalAt = (b: Branch, names: string[]) =>
    chart.palaces.find((p) => p.branch === b)!.stars.filter((s) => names.includes(s.name)).length;
  /* 煞刑：本命四煞 ＋ 流年、大限嘅流羊流陀 ＋ 天刑 */
  const sha = (b: Branch) =>
    natalAt(b, NATAL_SHA) + flows.reduce((n, f) => n + (f.擎羊 === b ? 1 : 0) + (f.陀羅 === b ? 1 : 0), 0) + (xing === b ? 1 : 0);
  /* 流羊流陀（流年或大限）：書推運限嘅例子差唔多都有 */
  const flow = (b: Branch) => flows.some((f) => f.擎羊 === b || f.陀羅 === b);
  const yang = (b: Branch) => natalAt(b, ['擎羊']) > 0 || flows.some((f) => f.擎羊 === b);
  const at = (name: string) => A.overlay.find((o) => o.annual === name)?.branch ?? null;
  const ji = A.sihua.annual.find((h) => h.hua === '忌');
  const jiB = ji?.branch ?? null;
  const jiIn = (...names: string[]) => Boolean(ji?.annualPalace && names.includes(ji.annualPalace));
  const ev = (kind: string) => LOOKBACK_EVENTS.find((e) => e.kind === kind)!;

  const ji厄 = at('疾厄');
  if (jiB && ji厄 === jiB && sha(jiB) >= 2 && flow(jiB)) return ev('身體');
  const m = A.mingGong;
  if (sha(m) >= 3 && yang(m) && jiIn('命宮', '遷移', '疾厄')) return ev('出行');
  if (jiB && ji && ['太陽', '巨門'].includes(ji.star) && jiIn('命宮', '官祿', '遷移') && (yang(jiB) || xing === jiB))
    return ev('是非');
  if (jiB && ji?.star === '太陰' && jiIn('財帛', '命宮', '田宅') && sha(jiB) >= 1 && flow(jiB)) return ev('錢');
  return null;
}

export function lookBack(chart: Chart, year: number): DaxianSegment | null {
  const born = chart.lunar.y;
  const pivot = pivotRule(chart, 'year');
  type Cand = { y: number; gz: string; age: number; score: number; key: boolean; event: string | null; parts: string[]; sources: string[] };
  const cands: Cand[] = [];
  for (let y = born + 17; y < year; y++) {
    const r = annual(chart, y);
    if (!r.ok) continue;
    const A = r.value;
    const parts: string[] = [];
    const sources: string[] = [];
    let score = 0;
    const turn = chart.decadals.find((d) => d.fromAge === A.nominalAge);
    if (turn) {
      parts.push(`你走進第${num(turn.index)}個大限，生活的重心換了方向，${turnEg(A.nominalAge)}`);
      score += 2;
    }
    const ji = A.sihua.annual.find((h) => h.hua === '忌');
    const lu = A.sihua.annual.find((h) => h.hua === '祿');
    const jiA = ji?.annualPalace ? JI_AREA[ji.annualPalace] : undefined;
    /* 心情、身心、自己嗰三方面一吃緊一順利，讀落自相矛盾（「心事較多⋯同一年身心鬆得下來」）：唔並講 */
    const MOOD = ['命宮', '福德', '疾厄'];
    const clash = Boolean(ji?.annualPalace && lu?.annualPalace && MOOD.includes(ji.annualPalace) && MOOD.includes(lu.annualPalace));
    const luA = lu?.annualPalace && lu.annualPalace !== ji?.annualPalace && !clash ? LU_AREA[lu.annualPalace] : undefined;
    /*
     * 書入面身體、出行、是非、錢嘅條件（一本書最多兩年，見下面）。
     * 佢講嘅就係呢年化忌嘅事，所以中咗就唔再出化忌嗰方面嘅句，免得同一件事講兩次。
     */
    const event = lookBackEvent(chart, A);
    if (event) {
      parts.push(event.text);
      sources.push(...event.sources.map((x) => x.passage_id));
      score += 3;
      if (luA) parts.push(`同一年，${luA.gist}`);
    } else if (jiA) {
      /* 換大限嗰年已經有一組例子：方面只講一句，唔好兩串「像是」 */
      parts.push(turn ? jiA.gist : `${jiA.gist}，${jiA.eg}`);
      sources.push('huigu.env');
      score += ['官祿', '夫妻', '田宅', '遷移', '財帛', '疾厄'].includes(ji!.annualPalace!) ? 2 : 1;
      if (luA) parts.push(`同一年，${luA.gist}`);
    } else if (luA) {
      parts.push(turn ? luA.gist : `${luA.gist}，${luA.eg}`);
      sources.push('huigu.env');
      score += 1;
    }
    const mp = chart.palaces.find((p) => p.branch === A.mingGong);
    const key = Boolean(pivot && mp && pivot.isPivot(mp));
    if (key) {
      sources.push(pivot!.source);
      score += 3;
    }
    if (score >= 3 && (parts.length || key)) cands.push({ y, gz: `${A.ganzhi[0]}${A.ganzhi[1]}`, age: A.nominalAge, score, key, event: event?.id ?? null, parts, sources });
  }
  const picked: Cand[] = [];
  for (const c of [...cands].sort((a, b) => b.score - a.score || b.y - a.y)) {
    if (picked.length >= 3) break;
    if (picked.some((p) => Math.abs(p.y - c.y) < 3)) continue;
    /* 身體、出行、是非、錢一本書最多講兩年 —— 三年都係難關，讀落似咒 */
    if (c.event && picked.filter((p) => p.event).length >= 2) continue;
    /* 同一類（例如兩年都係是非）只講一次：同一句出兩次，讀落似模板 */
    if (c.event && picked.some((p) => p.event === c.event)) continue;
    picked.push(c);
  }
  if (!picked.length) return null;
  picked.sort((a, b) => a.y - b.y);
  /* 「是你命盤裡的關鍵年份」第二次起改講「同樣是」，唔好連講三次 */
  let keySeen = false;
  const lines = picked.map((c) => {
    let head = '';
    if (c.key) {
      head = keySeen ? '同樣是關鍵的一年' : '是你命盤裡關鍵的一年';
      keySeen = true;
    }
    const body = c.parts.join('；');
    const text = head ? `${head}${body ? `：${body}` : ''}` : body;
    return `${yearCN(c.y)}年（${c.gz}年，你虛歲${num(c.age)}），${text}。`;
  });
  return {
    slot: '回看',
    text: `回看你走過的路：${lines.join('')}這幾年，對你來說是不是有過轉折？`,
    source_id: [...new Set(picked.flatMap((c) => c.sources))].join('+') || null,
    rule_ids: [],
  };
}

/**
 * 一生十二步只列到虛歲九十歲左右起步嗰幾步（2026-10-02）。
 * 以前列晒十二步，水二局會去到「第十二步 一百十二至一百二十一歲 關鍵大限」——
 * 讀者見到百幾歲，第一個感覺係「機器排出嚟」。之後嘅一句帶過。
 */
export const STEPS_UNTIL_AGE = 90;

export function lifeStepsChapter(input: { chart: Chart; year: number }): Out {
  const { chart, year } = input;
  const at = decadeAt(chart, year);
  if (!at || chart.decadals.length === 0) return null;
  const first = chart.decadals[0]!;
  const lead = at.started
    ? `你的大限由虛歲${num(first.fromAge)}歲起，每十年換一步；寫這本書時（${yearCN(year)}年），你走到第${num(at.d.index)}步。`
    : `你的大限由虛歲${num(first.fromAge)}歲起，每十年換一步；寫這本書時（${yearCN(year)}年），你還未起步。`;
  const shown = chart.decadals.filter((d) => d.fromAge < STEPS_UNTIL_AGE);
  /* 回看過去：讀者見到對得上嘅年份，之後嘅講法先容易接受 */
  const back = lookBack(chart, year);
  const rest = chart.decadals.find((d) => d.fromAge >= STEPS_UNTIL_AGE);
  const pv = pivotSteps(chart);
  const keySteps = pv.steps.filter((n) => shown.some((d) => d.index === n));
  const keyLine = keySteps.length
    ? `你命盤裡的關鍵大限是${keySteps.map((n) => `第${num(n)}步`).join('、')}：這幾步的得失，對你一生影響特別大。`
    : '';
  const steps: DaxianSegment[] = shown.map((d) => {
    const p = chart.palaces.find((x) => x.branch === d.branch)!;
    const now = (pv.steps.includes(d.index) ? '　關鍵大限。' : '') + (at.started && d.index === at.d.index ? '　寫這本書時，你在這一步。' : '');
    return {
      slot: '步',
      text: `第${num(d.index)}步　${num(d.fromAge)}至${num(d.toAge)}歲　${palaceLabel(p.name)}，${starsOf(chart, p)}。${now}`,
      source_id: null,
      rule_ids: [],
    };
  });
  return {
    slug: STEPS_SLUG,
    title: STEPS_SLUG,
    segments: [
      { slot: '結論', text: lead + keyLine, source_id: keySteps.length ? pv.source : null, rule_ids: [] },
      ...(back ? [back] : []),
      ...steps,
      ...(rest ? [{ slot: '步', text: `之後的大限從虛歲${num(rest.fromAge)}歲起，這裡不再細列。`, source_id: null, rule_ids: [] }] : []),
      { slot: '留白', text: DAXIAN_FRAMES.stepsClose, source_id: null, rule_ids: [] },
    ],
  };
}

/* ── 這十年（收費） ─────────────────────────────────── */

type Hit = { star: string; hua: Sihua; decadalPalace: string | null };

/** 大限命宮當命宮讀：改名，四化用大限嗰套（冇大限化嘅星留本命化）。 */
export function decadeView(chart: Chart, branch: string, hits: { star: string; hua: Sihua }[]): Chart {
  const by = new Map(hits.map((h) => [h.star, h.hua]));
  return {
    ...chart,
    palaces: chart.palaces.map((p) => ({
      ...p,
      name: p.branch === branch ? '命宮' : p.name === '命宮' ? ('__本命' as never) : p.name,
      stars: p.stars.map((s) => (by.has(s.name) ? { ...s, sihua: by.get(s.name) } : s)),
    })),
  };
}

export function decadeChapter(input: { chart: Chart; year: number }): Out {
  const { chart, year } = input;
  const at = decadeAt(chart, year);
  if (!at) return null;
  const { A, d, started } = at;
  const dp = chart.palaces.find((p) => p.branch === d.branch)!;

  /* 大限四化：已起運用引擎嗰份；未起運自己由宮干算，落喺邊宮用大限命宮推 */
  const table = sihuaOfStem(d.stem);
  if (!table) return null;
  const decIdx = chart.palaces.findIndex((p) => p.branch === d.branch);
  const ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
  const natalOrder = ORDER.indexOf(chart.palaces[decIdx]!.name);
  const decadalNameOf = (starName: string): string | null => {
    const p = chart.palaces.find((x) => x.stars.some((s) => s.name === starName));
    if (!p) return null;
    const k = (ORDER.indexOf(p.name) - natalOrder + 12) % 12;
    return ORDER[k]!;
  };
  const hits: Hit[] = (['祿', '權', '科', '忌'] as Sihua[]).map((h) => ({
    star: table[h],
    hua: h,
    decadalPalace: started ? (A.sihua.decadal?.find((x) => x.hua === h)?.decadalPalace ?? decadalNameOf(table[h])) : decadalNameOf(table[h]),
  }));
  const natal = new Map(A.sihua.natal.map((h) => [h.star, h.hua]));

  /* 結論：祿落邊、忌落邊（呢十年嘅宮） */
  const lu = hits.find((h) => h.hua === '祿')!;
  const ji = hits.find((h) => h.hua === '忌')!;
  const when = started
    ? `寫這本書時（${yearCN(year)}年），你虛歲${num(A.nominalAge)}，正行第${num(d.index)}個大限（${num(d.fromAge)}至${num(d.toAge)}歲）。`
    : `寫這本書時（${yearCN(year)}年），你虛歲${num(A.nominalAge)}，第一個大限從虛歲${num(d.fromAge)}歲開始。`;
  /* 未成年：下面講嘅（實權、上級、合約）係呢十年身邊嘅環境，唔係佢自己要做嘅事 */
  const young = d.toAge <= 20 ? '你還年少，下面講的是這十年身邊的環境，很多要到長大後才用得上。' : '';
  const gist =
    lu.decadalPalace && lu.decadalPalace === ji.decadalPalace
      ? `這十年，你的${area(lu.decadalPalace)}起伏較大，有得著，也有牽掛。`
      : `這十年，你的${area(lu.decadalPalace)}比較順，${area(ji.decadalPalace)}要多留神。`;

  /* 大限命宮：盤面事實 ＋ 六十星系偏向（用大限四化） */
  const fact = `這個大限落在你的${palaceLabel(dp.name)}，${starsOf(chart, dp)}，宮干是${d.stem}。`;
  const view = decadeView(chart, d.branch, hits);
  const x = xingxiOf(view);
  const leanLine = x ? `這十年裡，${x.system.plain.lean[leanOf(view, x.system).pole]}` : '';

  /* 分四方面（工作、錢、感情、心境）：起咗運先有大限盤 */
  const areas = started
    ? areaSegments(
        chart,
        (b) => A.overlay.find((o) => o.branch === b)?.decadal ?? null,
        hits.map((h) => ({ star: h.star, hua: h.hua, palace: h.decadalPalace })),
        '這十年',
      )
    : { segments: [], used: new Set<string>() };
  const advice = started ? adviceSegment(hits.map((h) => ({ star: h.star, hua: h.hua, palace: h.decadalPalace })), '這十年') : null;

  /* 四化：逐粒講，落喺呢十年嘅邊宮（四方面已經講咗嘅唔再講） */
  const huaLines = hits.filter((h) => !areas.used.has(`${h.star}${h.hua}`)).map((h) => {
    const m = DAXIAN_HUA.find((e) => e.star === h.star && e.hua === h.hua);
    const where = h.decadalPalace ? `（在這十年的${palaceLabel(h.decadalPalace)}）` : '';
    return { text: m ? `${h.star}化${h.hua}${where}：${m.text}` : '', id: m?.id ?? null };
  });

  /* 同本命四化碰唔碰到 */
  const inter = hits.flatMap((h) => {
    const n = natal.get(h.star);
    if (!n) return [];
    const r = DAXIAN_RULES.rules.find((r) => r.natal === n && r.decade === h.hua);
    return r ? [{ text: r.text.replace('{star}', h.star), id: r.id }] : [];
  });
  const touched = hits.some((h) => natal.has(h.star));
  const interSeg = inter.length
    ? { text: inter.map((i) => i.text).join(''), id: inter.map((i) => i.id).join('+') }
    : touched
      ? null
      : { text: DAXIAN_RULES.none.text, id: DAXIAN_RULES.none.id };

  /* 下一個十年 */
  const next = chart.decadals.find((x) => x.index === d.index + 1);
  let nextLine = '';
  if (next) {
    const np = chart.palaces.find((p) => p.branch === next.branch)!;
    const nt = sihuaOfStem(np.stem);
    nextLine = `下一個大限從虛歲${num(next.fromAge)}歲開始，轉到${palaceLabel(np.name)}，${starsOf(chart, np)}${nt ? `；那十年${nt['祿']}化祿、${nt['忌']}化忌` : ''}。`;
  }

  const seg = (slot: string, text: string, source_id: string | null = null): DaxianSegment => ({ slot, text, source_id, rule_ids: [] });
  const segments = [
    seg('結論', when + gist + young + (pivotSteps(chart).steps.includes(d.index) ? '這十年是你命盤裡的關鍵大限之一，這段時期的得失，對你一生影響特別大。' : '')),
    seg('大限', fact + leanLine, x ? `xingxi.${x.system.n}` : null),
    ...areas.segments,
    seg('四化', huaLines.length && areas.segments.length ? `四化各自的意思：${huaLines.map((l) => l.text).join('')}` : huaLines.map((l) => l.text).join(''), huaLines.map((l) => l.id).filter(Boolean).join('+') || null),
    ...(interSeg ? [seg('互動', interSeg.text, interSeg.id)] : []),
    ...(advice ? [advice] : []),
    ...(nextLine ? [seg('下一步', nextLine)] : []),
    seg('留白', DAXIAN_FRAMES.decadeClose),
  ].filter((s) => s.text.trim() !== '');
  return { slug: DECADE_SLUG, title: DECADE_SLUG, segments };
}
