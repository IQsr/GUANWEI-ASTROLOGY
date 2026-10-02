import type { Chart, Palace } from '@guanwei/ziwei';
import { BASE_BLOCKS } from './baseblock-data';
import { FORBIDDEN_TERMS } from './frame';
import { palacePlain } from './palace-plain';
import { xingxiOf } from './xingxi';
import { decadeChapter } from './daxian';
import { AREA } from './link';
import { yearChapter } from './liunian';

/* ───────────────────────────────────────────────────────────
 * 給你的話（2026-10-02 · 書尾總結，收費章）
 *
 * 畀咗錢、讀完十幾章，讀者要有一個「收穫」：幾句講得出口嘅說話。
 *
 *   結論   你是怎樣的人（性格的骨架嗰句總結）
 *   長處   三樣可以倚仗嘅：骨架嘅長處、做事（官祿）、本命化祿嗰方面
 *   留意   三件要記住嘅事：命宮嘅提醒、本命化忌嗰方面、骨架嘅提醒
 *   時間   這十年、這一年最值得做的事（兩章嘅建議段）
 *   留白
 *
 * ⚠ 冇新嘅命理主張：每一句都係書入面已經講過、有出處嗰句，呢度只係揀同排。
 *    出處跟返原句（xingxi.N、plain.星.宮、兩章嘅建議）。
 * ─────────────────────────────────────────────────────────── */

export const EPILOGUE_SLUG = '給你的話';

export const EPILOGUE_CLOSE = '命書寫的是一張底圖。往後的路怎樣走，仍然在你；需要的時候，再翻回來看看。';
{
  const bad = FORBIDDEN_TERMS.filter((w) => EPILOGUE_CLOSE.includes(w));
  if (bad.length) throw new Error(`給你的話：留白唔准講命理：${bad.join('、')}`);
}

const MAJOR = new Set(BASE_BLOCKS.map((b) => b.star));

/** 一個宮嘅領銜主星；空宮借對宮。 */
function leadOf(chart: Chart, p: Palace): string | null {
  const own = p.stars.find((s) => MAJOR.has(s.name));
  if (own) return own.name;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  return opp?.stars.find((s) => MAJOR.has(s.name))?.name ?? null;
}

/** 本命某化（祿／忌）落喺邊個宮。 */
function palaceOfHua(chart: Chart, hua: '祿' | '忌'): Palace | undefined {
  return chart.palaces.find((p) => p.stars.some((s) => s.sihua === hua));
}

type Seg = { slot: string; text: string; source_id: string | null; rule_ids: string[] };

export function epilogueChapter(input: { chart: Chart; year: number }): { slug: string; title: string; segments: Seg[] } | null {
  const { chart, year } = input;
  const x = xingxiOf(chart);
  if (!x) return null;
  const plain = x.system.plain;
  const xid = `xingxi.${x.system.n}`;

  const lineOf = (name: string) => {
    const p = chart.palaces.find((q) => q.name === name);
    const lead = p ? leadOf(chart, p) : null;
    return lead ? palacePlain(lead, name) : undefined;
  };
  const strip = (watch: string) => watch.replace(/^要留意的是：/, '');
  /* 由宮位抽嘅句加返係邊方面（「心境上，」）—— 抽出嚟之後冇咗章名，讀者唔知講緊邊樣 */
  const tag = (name: string, text: string) => (name === '命宮' ? text : `${AREA[name]?.[1] ?? ''}，${text}`);

  /* 長處：骨架嘅長處 → 做事 → 化祿嗰方面（同前面重複就跳過） */
  const luP = palaceOfHua(chart, '祿');
  const strengths: { text: string; id: string }[] = [{ text: plain.strength, id: xid }];
  for (const name of ['官祿', luP?.name, '財帛', '遷移']) {
    if (!name || strengths.length >= 3 || name === '命宮') continue;
    const pp = lineOf(name);
    if (pp && !strengths.some((s) => s.id === pp.id)) strengths.push({ text: tag(name, pp.summary), id: pp.id });
  }

  /* 留意：命宮 → 化忌嗰方面 → 骨架 */
  const jiP = palaceOfHua(chart, '忌');
  const watches: { text: string; id: string }[] = [];
  for (const name of ['命宮', jiP?.name, '夫妻']) {
    if (!name || watches.length >= 2) continue;
    const pp = lineOf(name);
    if (pp && !watches.some((w) => w.id === pp.id)) watches.push({ text: tag(name, strip(pp.watch)), id: pp.id });
  }
  watches.push({ text: strip(plain.watch), id: xid });

  /* 時間：兩章嘅建議段（冇就唔出） */
  const advice = [decadeChapter({ chart, year }), yearChapter({ chart, year })]
    .map((c) => c?.segments.find((s) => s.slot === '建議')?.text)
    .filter((t): t is string => Boolean(t));

  const NUM = ['一', '二', '三'];
  const listed = (xs: { text: string }[]) => xs.map((s, i) => `${NUM[i]}、${s.text}`).join('');

  const segments: Seg[] = [
    { slot: '結論', text: plain.summary, source_id: xid, rule_ids: [] },
    { slot: '長處', text: `你可以倚仗的：${listed(strengths)}`, source_id: strengths.map((s) => s.id).join('+'), rule_ids: [] },
    { slot: '留意', text: `你要記住的：${listed(watches)}`, source_id: watches.map((w) => w.id).join('+'), rule_ids: [] },
    ...(advice.length ? [{ slot: '時間', text: advice.join(''), source_id: null, rule_ids: [] }] : []),
    { slot: '留白', text: EPILOGUE_CLOSE, source_id: null, rule_ids: [] },
  ];
  return { slug: EPILOGUE_SLUG, title: EPILOGUE_SLUG, segments };
}
