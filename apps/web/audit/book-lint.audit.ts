/**
 * 成書抽查（2026-10-25）
 *
 * 每次起一批新嘅隨機盤，用正式成書入口 `createBookChapters` 出成本書，再自動標三類問題：
 *   A. 段落寫咗本盤冇嘅條件：本命冇嘅四化（「天同化祿」但本盤冇）、男命／女命同性別唔夾、
 *      提到本宮四方同段內點名宮位都冇嘅星。
 *   B. 「據」錯配：引用原段標題嘅星曜，喺嗰段所講嘅宮位（借宮就睇對宮）搵唔到。
 *      連三方四正都冇算錯（B1）；只喺四方嘅另列待核（B3），因為原書常講會照。
 *   C. 模板重複：同一段文字逐字出現喺好多本書。
 * 只讀唔寫：唔改內容、唔寫 DB。每輪換 seed，唔好淨係睇示範盤同固定樣本。
 *
 * 跑法（apps/web）：npm run audit:book
 *   呢部機 pnpm 被擋：node node_modules/vitest/vitest.mjs run --config vitest.audit.config.ts
 *   LINT_CHARTS=150  盤數
 *   LINT_SEED=…      隨機種子（預設用當日日期，報告會記低，可以重現）
 *   LINT_OUT=…       輸出目錄（預設 repo 根 tmp/book-lint/<seed>/）
 */
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cast, oppositeBranch, sanFangPalaces, QUERYABLE_NATAL_STARS, type BirthInput, type Chart, type Palace } from '@guanwei/ziwei';
import { citation } from '@guanwei/content';
import { createBookChapters } from '@/lib/mingshu';
import { readingSegments } from '@/lib/chapter-reading';

const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'] as const;
/** 讀本命盤面嘅章；運限章（這十年、這一年、一生十二步）講流年大限四化，唔用 A 檢查。 */
const NATAL = new Set<string>([...PALACES, '性格的骨架', '身宮與五行局', '給你的話']);
const TIMING_SLOTS = new Set(['時間']);
const ALIAS: Record<string, string> = { 交友: '僕役', 事業: '官祿', 奴僕: '僕役' };
const STARS = [...QUERYABLE_NATAL_STARS].sort((a, b) => b.length - a.length);
const HUA = new RegExp(`(${STARS.join('|')})化(祿|權|科|忌)`, 'g');
const NEG = /(未|沒有|沒|不|無|非|並非)[^。；，]{0,6}$/;
/** 段落自己講明本盤唔符合（好寫法），唔當錯。 */
const SAYS_ABSENT = /本盤(沒有|未|並無|不)|這張盤(未|沒有)|未採用|不套用|不適用/;

type Finding = { check: string; level: 'error' | 'warn'; book: string; chapter: string; slot: string; detail: string; text: string };

function rng(seed: number) { let s = seed >>> 0; return (n: number) => { s = (s * 1103515245 + 12345) % 2147483648; return s % n; }; }
const palaceOf = (c: Chart, name: string) => c.palaces.find((p) => p.name === (ALIAS[name] ?? name));
/** 借宮：本宮冇主星就用對宮嘅星。 */
function starsOf(c: Chart, p: Palace): Set<string> {
  const own = p.stars.map((s) => s.name);
  const major = p.stars.some((s) => s.kind === 'major');
  const opp = major ? [] : c.palaces.find((q) => q.branch === oppositeBranch(p.branch))!.stars.map((s) => s.name);
  return new Set([...own, ...opp]);
}
function fourStars(c: Chart, p: Palace): Set<string> {
  return new Set(sanFangPalaces(c.palaces, p.branch).flatMap((q) => [...starsOf(c, q)]));
}
/** 四方再加左右夾宮（原書常講「夾」）。 */
function nearStars(c: Chart, p: Palace): Set<string> {
  const i = c.palaces.findIndex((q) => q.branch === p.branch), k = c.palaces.length;
  const out = fourStars(c, p);
  for (const q of [c.palaces[(i + 1) % k]!, c.palaces[(i + k - 1) % k]!]) for (const s of q.stars) out.add(s.name);
  return out;
}
const chapterPalace = (slug: string) => slug === '性格的骨架' || slug === '身宮與五行局' ? '命宮' : (PALACES as readonly string[]).includes(slug) ? slug : null;
const namedPalaces = (text: string) => [...text.matchAll(/(命宮|兄弟|夫妻|子女|財帛|疾厄|遷移|僕役|交友|官祿|事業|田宅|福德|父母)/g)].map((m) => ALIAS[m[1]!] ?? m[1]!);
const starsIn = (text: string) => { const out: string[] = []; let t = text; for (const s of STARS) if (t.includes(s)) { out.push(s); t = t.split(s).join('　'); } return out; };

function birth(r: (n: number) => number): BirthInput {
  return { solar: { y: 1950 + r(58), m: 1 + r(12), d: 1 + r(28) }, time: { h: r(24), min: r(60) }, tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: r(2) ? 'male' : 'female' };
}

function lintBook(id: string, input: BirthInput, chart: Chart, out: Finding[], paras: Map<string, Set<string>>) {
  const book = createBookChapters(chart, { seed: id, year: 2026, solar: input.solar, place: input.place.label, birthSex: input.sex, birthInput: input });
  if (!book) { out.push({ check: 'build', level: 'error', book: id, chapter: '-', slot: '-', detail: '成書失敗', text: '' }); return; }
  const natalHua = new Set(chart.palaces.flatMap((p) => p.stars.filter((s) => s.sihua).map((s) => `${s.name}化${s.sihua}`)));
  for (const ch of book) {
    const add = (check: string, level: Finding['level'], slot: string, detail: string, text: string) => out.push({ check, level, book: id, chapter: ch.slug, slot, detail, text });
    const home = chapterPalace(ch.slug);
    for (const seg of readingSegments(ch.text, ch.slots ?? [], ch.reading)) {
      const text = seg.text;
      if (text.length > 25) { const key = `${ch.slug}\u0000${text}`; if (!paras.has(key)) paras.set(key, new Set()); paras.get(key)!.add(id); }
      // A. 本盤冇嘅條件
      if (NATAL.has(ch.slug) && !TIMING_SLOTS.has(seg.slot)) {
        for (const m of text.matchAll(HUA)) {
          if (NEG.test(text.slice(0, m.index)) || SAYS_ABSENT.test(text)) continue;
          if (!natalHua.has(m[0])) add('A1 本盤冇嘅四化', 'error', seg.slot, m[0], text);
        }
        const wrongSex = input.sex === 'female' ? '男命' : '女命';
        if (text.includes(wrongSex)) add('A2 性別唔夾', 'error', seg.slot, `${wrongSex}（本盤${input.sex === 'female' ? '女' : '男'}命）`, text);
        if (home) {
          const allowed = nearStars(chart, palaceOf(chart, home)!);
          for (const n of namedPalaces(text)) { const q = palaceOf(chart, n); if (q) for (const s of fourStars(chart, q)) allowed.add(s); }
          const stray = starsIn(text).filter((s) => !allowed.has(s));
          if (stray.length) add('A3 提到四方冇嘅星', 'warn', seg.slot, stray.join('、'), text);
        }
      }
      // B. 據錯配
      const cites = [...new Set(seg.statements?.flatMap((l) => l.citations) ?? [])];
      for (const cid of cites) {
        const ct = citation(cid);
        if (!ct?.section) continue;
        const section = ct.section.replace(/〔[^〕]*〕|（[^）]*）/g, '');
        const parts = section.split(/\s*[・·]\s*/);
        const named = parts.map((x) => x.match(/^(命宮|兄弟|夫妻|子女|財帛|疾厄|遷移|僕役|交友|官祿|事業|田宅|福德|父母)宮?$/)?.[1]).find(Boolean);
        const target = named ? ALIAS[named] ?? named : home;
        if (!target) continue;
        const stars = starsIn(parts.filter((x) => !/^(上篇|中篇|下篇|宮垣論|.{2}宮)$/.test(x)).join(' '));
        if (!stars.length) continue;
        const tp = palaceOf(chart, target)!, have = starsOf(chart, tp), near = fourStars(chart, tp);
        const missing = stars.filter((s) => !have.has(s));
        if (missing.length === stars.length && missing.some((s) => !near.has(s))) add('B1 據嘅星不在該宮四方', 'error', seg.slot, `${ct.section}（${target}宮四方無${missing.filter((s) => !near.has(s)).join('、')}）`, text);
        else if (missing.length === stars.length) add('B3 據嘅星只喺四方（核對係咪講會照）', 'warn', seg.slot, `${ct.section}（${target}宮無${missing.join('、')}，四方有）`, text);
        else if (missing.some((s) => !near.has(s))) add('B2 據混入該宮四方都冇嘅星', 'warn', seg.slot, `${ct.section}（${target}宮四方無${missing.filter((s) => !near.has(s)).join('、')}）`, text);
      }
    }
  }
}

it('book lint on fresh random charts', () => {
  const n = Number(process.env.LINT_CHARTS ?? 150);
  const seed = Number(process.env.LINT_SEED ?? new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const outDir = process.env.LINT_OUT ?? new URL(`../../../tmp/book-lint/${seed}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const r = rng(seed), findings: Finding[] = [], paras = new Map<string, Set<string>>(), inputs: { id: string; input: BirthInput; ming: string }[] = [];
  while (inputs.length < n) {
    const input = birth(r), c = cast(input);
    if (!c.ok) continue;
    const id = `L${seed}-${inputs.length}`;
    const ming = c.value.palaces.find((p) => p.branch === c.value.mingGong)!;
    inputs.push({ id, input, ming: `${ming.branch}${ming.stars.filter((s) => s.kind === 'major').map((s) => s.name).join('') || '空宮'}` });
    lintBook(id, input, c.value, findings, paras);
  }
  // C. 模板重複：同一段逐字出現喺 ≥3 本、≥5% 嘅書
  const min = Math.max(3, Math.ceil(n * 0.05));
  const repeats = [...paras].filter(([, b]) => b.size >= min).map(([k, b]) => { const [chapter, text] = k.split('\u0000'); return { chapter: chapter!, text: text!, books: b.size, share: b.size / n }; })
    .sort((a, b) => b.books - a.books);
  const framing = repeats.filter((x) => x.share >= 0.9), template = repeats.filter((x) => x.share < 0.9);

  const by = (key: (f: Finding) => string) => { const m = new Map<string, number>(); for (const f of findings) m.set(key(f), (m.get(key(f)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
  const booksWith = (check: string) => new Set(findings.filter((f) => f.check === check).map((f) => f.book)).size;
  const checks = [...new Set(findings.map((f) => f.check))].sort();
  const sample = (check: string, k = 12) => { const seen = new Set<string>(); return findings.filter((f) => f.check === check && !seen.has(f.chapter + f.detail) && seen.add(f.chapter + f.detail)).slice(0, k); };
  const lines = [
    `# 成書抽查 ${seed}`, '', `盤數 ${n}（隨機 1950–2007，香港，男女隨機）。正式成書入口 createBookChapters，寫書年 2026。`, '',
    '## 總數', '', '| 檢查 | 級別 | 次數 | 涉及書數 |', '|---|---|---|---|',
    ...checks.map((c) => `| ${c} | ${findings.find((f) => f.check === c)!.level} | ${findings.filter((f) => f.check === c).length} | ${booksWith(c)} / ${n} |`),
    `| C 模板重複（5%–90% 書） | warn | ${template.length} 段 | - |`, `| C 固定框架句（≥90% 書） | info | ${framing.length} 段 | - |`, '',
    '## 按章（A、B）', '', ...by((f) => `${f.check}｜${f.chapter}`).slice(0, 30).map(([k, v]) => `- ${k}：${v}`), '',
    ...checks.flatMap((c) => [`## 例子：${c}`, '', ...sample(c).map((f) => `- **${f.book} ${f.chapter}［${f.slot}］** ${f.detail}\n  > ${f.text.slice(0, 140)}`), '']),
    '## C 模板重複（最多書嘅 25 段）', '', ...template.slice(0, 25).map((x) => `- ${x.books} 本（${Math.round(x.share * 100)}%）［${x.chapter}］${x.text.slice(0, 90)}`), '',
    '## C 固定框架句', '', ...framing.map((x) => `- ${x.books} 本［${x.chapter}］${x.text.slice(0, 60)}`), '',
  ];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/report.md`, lines.join('\n'), 'utf8');
  writeFileSync(`${outDir}/findings.json`, JSON.stringify({ seed, n, inputs, findings, repeats }, null, 1), 'utf8');
  console.log(`book-lint: ${findings.length} findings, ${template.length} template paragraphs → ${outDir}`);
});
