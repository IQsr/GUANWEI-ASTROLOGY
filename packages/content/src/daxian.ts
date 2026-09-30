import { z } from 'zod';
import { annual, sihuaOfStem, type Chart, type Palace, type Sihua } from '@guanwei/ziwei';
import huaRaw from './daxian/hua.json';
import rulesRaw from './daxian/rules.json';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';
import { AREA, palaceLabel } from './link';
import { FORBIDDEN_TERMS } from './frame';
import { leanOf, xingxiOf } from './xingxi';

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

const Hua = z
  .object({ id: z.string(), star: z.string(), hua: z.enum(['祿', '權', '科', '忌']), text: z.string(), source: Source })
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
export const DAXIAN_RULES = RulesDoc.parse(rulesRaw);

/* 章框（冇來源，唔准讀象） */
export const DAXIAN_FRAMES = {
  stepsClose: '十二步是一條路的形狀，走得快慢、走向哪裡，仍然在你。回頭看看，你走過的幾步，和這裡寫的像不像。',
  decadeClose: '這十年的環境是這樣，怎樣走仍然在你。回頭看看，你現在最花心思的，是不是這幾方面。',
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
function num(n: number): string {
  if (n >= 100) {
    const r = n % 100;
    return `一百${r === 0 ? '' : r < 10 ? `零${DIGITS[r]}` : num(r)}`;
  }
  if (n < 10) return DIGITS[n]!;
  if (n < 20) return `十${n % 10 ? DIGITS[n % 10] : ''}`;
  return `${DIGITS[Math.floor(n / 10)]}十${n % 10 ? DIGITS[n % 10] : ''}`;
}
const yearCN = (y: number) => [...String(y)].map((d) => DIGITS[Number(d)]).join('');

const majors = (p: Palace) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
function starsOf(chart: Chart, p: Palace): string {
  const own = majors(p);
  if (own.length) return `坐${own.join('、')}`;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  const b = opp ? majors(opp) : [];
  return b.length ? `沒有主星，借對宮的${b.join('、')}` : '沒有主星';
}
const area = (palace: string | null) => (palace ? (AREA[palace]?.[0] ?? palaceLabel(palace)) : '');

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
export function lifeStepsChapter(input: { chart: Chart; year: number }): Out {
  const { chart, year } = input;
  const at = decadeAt(chart, year);
  if (!at || chart.decadals.length === 0) return null;
  const first = chart.decadals[0]!;
  const lead = at.started
    ? `你的大限由虛歲${num(first.fromAge)}歲起，每十年換一步，一生共十二步；寫這本書時（${yearCN(year)}年），你走到第${num(at.d.index)}步。`
    : `你的大限由虛歲${num(first.fromAge)}歲起，每十年換一步，一生共十二步；寫這本書時（${yearCN(year)}年），你還未起步。`;
  const steps: DaxianSegment[] = chart.decadals.map((d) => {
    const p = chart.palaces.find((x) => x.branch === d.branch)!;
    const now = at.started && d.index === at.d.index ? '　寫這本書時，你在這一步。' : '';
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
    segments: [{ slot: '結論', text: lead, source_id: null, rule_ids: [] }, ...steps, { slot: '留白', text: DAXIAN_FRAMES.stepsClose, source_id: null, rule_ids: [] }],
  };
}

/* ── 這十年（收費） ─────────────────────────────────── */

type Hit = { star: string; hua: Sihua; decadalPalace: string | null };

/** 大限命宮當命宮讀：改名，四化用大限嗰套（冇大限化嘅星留本命化）。 */
function decadeView(chart: Chart, branch: string, hits: Hit[]): Chart {
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

  /* 四化：逐粒講，落喺呢十年嘅邊宮 */
  const huaLines = hits.map((h) => {
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
    seg('結論', when + gist + young),
    seg('大限', fact + leanLine, x ? `xingxi.${x.system.n}` : null),
    seg('四化', huaLines.map((l) => l.text).join(''), huaLines.map((l) => l.id).filter(Boolean).join('+') || null),
    ...(interSeg ? [seg('互動', interSeg.text, interSeg.id)] : []),
    ...(nextLine ? [seg('下一步', nextLine)] : []),
    seg('留白', DAXIAN_FRAMES.decadeClose),
  ].filter((s) => s.text.trim() !== '');
  return { slug: DECADE_SLUG, title: DECADE_SLUG, segments };
}
