import type { Chart, Palace } from '@guanwei/ziwei';
import { BASE_BLOCKS } from './baseblock-data';
import { FORBIDDEN_TERMS } from './frame';
import { conclusionFor } from './palace-plain';
import { variantFor } from './plain-variant';
import { leanOf, strengthFor, summaryFor, watchFor, xingxiOf } from './xingxi';
import { decadeChapter } from './daxian';
import { AREA } from './link';
import { yearChapter } from './liunian';
import { gujiaException } from './branch';

/* ───────────────────────────────────────────────────────────
 * 給你的話（2026-10-02 · 書尾總結，收費章）
 *
 * 畀咗錢、讀完十幾章，讀者要有一個「收穫」：幾句講得出口嘅說話。
 *
 *   結論   你是怎樣的人（性格的骨架嗰句總結）
 *   長處   三樣可以倚仗嘅：骨架嘅長處、做事（官祿）、本命化祿嗰方面（化忌嗰宮、疾厄唔做長處）
 *   留意   三件要記住嘅事：命宮嘅提醒、本命化忌嗰方面、骨架嘅提醒（長處用咗嘅方面唔再講）
 *   時間   這十年、這一年最值得做的事（兩章嘅建議段）
 *   留白
 *
 * ⚠ 冇新嘅命理主張：每一句都係書入面已經講過、有出處嗰句，呢度只係揀同排。
 *    出處跟返原句（xingxi.N、plain.星.宮、兩章嘅建議）。
 * ─────────────────────────────────────────────────────────── */

export const EPILOGUE_SLUG = '給你的話';

/** 句子自己已經講明方面嘅字（見 `tag`）：有就唔再加「錢方面，」呢類方面 */
const AREA_WORDS: Record<string, readonly string[]> = {
  兄弟: ['朋輩', '朋友'],
  夫妻: ['感情', '伴侶'],
  子女: ['後輩', '晚輩', '子女'],
  財帛: ['錢'],
  疾厄: ['身心', '身體'],
  遷移: ['在外', '新環境'],
  僕役: ['朋友', '人脈'],
  官祿: ['工作', '做事'],
  田宅: ['家', '住'],
  福德: ['心境'],
  父母: ['長輩', '上司'],
};

export const EPILOGUE_CLOSE = '命書寫的是一張底圖。往後的路怎樣走，仍然在你；需要的時候，再翻回來看看。';
{
  const bad = FORBIDDEN_TERMS.filter((w) => EPILOGUE_CLOSE.includes(w));
  if (bad.length) throw new Error(`給你的話：留白唔准講命理：${bad.join('、')}`);
}

const MAJOR = new Set(BASE_BLOCKS.map((b) => b.star));

/** 一個宮嘅主星（領銜行先）；空宮借對宮。 */
function majorsOf(chart: Chart, p: Palace): string[] {
  const own = p.stars.filter((s) => MAJOR.has(s.name)).map((s) => s.name);
  if (own.length) return own;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  return opp ? opp.stars.filter((s) => MAJOR.has(s.name)).map((s) => s.name) : [];
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
  const xid = `xingxi.${x.system.n}`;

  const lineOf = (name: string) => {
    const p = chart.palaces.find((q) => q.name === name);
    /* 雙星整合版優先（2026-10-11）：同宮章結論一致 */
    const names = p ? majorsOf(chart, p) : [];
    const ji = p?.stars.find((s) => MAJOR.has(s.name) && s.sihua === '忌')?.name ?? null;
    const base = names.length ? conclusionFor(names, name, ji) : undefined;
    /* 同宮位章一樣：帶條件嘅結論句（plain-variant.ts） */
    const v = base ? variantFor(chart, base) : undefined;
    return base && v ? { ...base, summary: v.summary } : base;
  };
  const strip = (watch: string) => watch.replace(/^要留意的是：/, '');
  /* 由宮位抽嘅句加返係邊方面（「心境上，」）—— 抽出嚟之後冇咗章名，讀者唔知講緊邊樣 */
  const tag = (name: string, text: string) => {
    if (name === '命宮') return text;
    /*
     * 句子第一截已經講咗係邊方面就唔再加（2026-10-14 · 200 本有 125 本中）：
     * 「錢方面，你對錢是夠用就好」「對長輩時，你對長輩和上司有話直說」—— 方面講兩次。
     */
    const head = text.split(/[，：。]/)[0] ?? '';
    if ((AREA_WORDS[name] ?? []).some((w) => head.includes(w))) return text;
    const on = AREA[name]?.[1] ?? '';
    /* 「對長輩時，你投入了卻得不到回應時」兩個「時」（2026-10-14）：句子自己有「⋯時」就剝走方面嗰個 */
    return `${on.endsWith('時') && /^[^，。]*時/.test(text) ? on.slice(0, -1) : on}，${text}`;
  };

  /*
   * ⚠ 長處同留意唔講同一方面（2026-10-04）：以前化忌落官祿，就會「長處：工作上⋯」「要記住：工作上⋯」
   *   兩邊都係工作，讀落似自己矛盾（200 本有 28 本）。所以一個宮只會用一次，化忌嗰宮唔做長處。
   * ⚠ 疾厄唔做長處：佢嘅結論句講身心負荷（「你的疲累⋯」），放喺「你可以倚仗的」唔通。
   */
  const luP = palaceOfHua(chart, '祿');
  const jiP = palaceOfHua(chart, '忌');
  const taken = new Set<string>(['命宮']);

  /* 長處：骨架嘅長處 → 做事 → 化祿嗰方面 → 錢、在外、心境、家（同前面重複就跳過） */
  /*
   * 骨架章有原文例外（例如天同化忌、羊陀夾忌：兩種取向之間拉扯）嗰陣，星系嘅通用結論同長處
   * （「不急不躁」「穩當、可靠」）同正文打架 —— 結論改用骨架嗰句，長處唔用星系通用句（2026-10-14 審稿）。
   */
  const exc = gujiaException(chart);
  const pole = leanOf(chart, x.system).pole;
  const strengths: { text: string; id: string }[] = exc ? [] : [{ text: strengthFor(x.system, pole), id: xid }];
  /*
   * 第一段（免費）揀一樣最具體嘅長處同命宮提醒（2026-10-17，docs/leads-audit-2026-10-17.md B3）：
   * 以前第一段得一句星系總結，同主星系嘅人一字不差。揀走嗰樣喺清單由下一個候選補上，
   * 清單照舊各三樣，第一段同清單唔重複。
   */
  const want = 4;
  for (const name of ['官祿', luP?.name, '財帛', '遷移', '福德', '田宅', '兄弟', '子女', '父母']) {
    if (!name || strengths.length >= want || taken.has(name) || name === jiP?.name || name === '疾厄') continue;
    const pp = lineOf(name);
    if (pp && !strengths.some((s) => s.id === pp.id)) {
      strengths.push({ text: tag(name, pp.summary), id: pp.id });
      taken.add(name);
    }
  }

  /* 留意：命宮 → 化忌嗰方面 → 感情 → 心境、朋友圈（長處用咗嘅宮跳過）→ 骨架 */
  const watches: { text: string; id: string }[] = [];
  for (const name of ['命宮', jiP?.name, '夫妻', '福德', '僕役']) {
    if (!name || watches.length >= 3 || (name !== '命宮' && taken.has(name))) continue;
    const pp = lineOf(name);
    if (pp && !watches.some((w) => w.id === pp.id)) {
      watches.push({ text: tag(name, strip(pp.watch)), id: pp.id });
      taken.add(name);
    }
  }
  watches.push({ text: strip(watchFor(x.system, pole)), id: xid });

  /* 時間：兩章嘅建議段（冇就唔出） */
  /* 2026-10-13：唔再原句照印兩章嘅建議段（同一本書講兩次），用撮要句 */
  const advice = [decadeChapter({ chart, year }), yearChapter({ chart, year })]
    .map((c) => (c?.segments.find((s) => s.slot === '建議') as { brief?: string } | undefined)?.brief)
    .filter((t): t is string => Boolean(t));

  /* 第一段：最具體嘅一樣長處（唔用星系通用句）＋命宮提醒；其餘入清單 */
  const leadStrength = strengths.find((s) => s.id !== xid) ?? null;
  const leadWatch = watches[0]?.id !== xid ? (watches[0] ?? null) : null;
  const restStrengths = strengths.filter((s) => s !== leadStrength).slice(0, 3);
  const restWatches = watches.filter((w) => w !== leadWatch).slice(0, 3);
  const summary = exc ? (exc.text.match(/^[^。]*。/)?.[0] ?? exc.text) : summaryFor(x.system, pole);
  const lead =
    summary +
    (leadStrength ? `最可以倚仗的一點：${leadStrength.text}` : '') +
    (leadWatch ? `最要記住的一點：${leadWatch.text}` : '');
  const NUM = ['一', '二', '三'];
  const listed = (xs: { text: string }[]) => xs.map((s, i) => `${NUM[i]}、${s.text}`).join('');

  const segments: Seg[] = [
    {
      slot: '結論',
      text: lead,
      source_id: [exc ? exc.source.passage : xid, leadStrength?.id, leadWatch?.id].filter(Boolean).join('+'),
      rule_ids: exc ? [exc.id] : [],
    },
    { slot: '長處', text: `${leadStrength ? '其他' : '你'}可以倚仗的：${listed(restStrengths)}`, source_id: restStrengths.map((s) => s.id).join('+'), rule_ids: [] },
    { slot: '留意', text: `${leadWatch ? '其他' : '你'}要記住的：${listed(restWatches)}`, source_id: restWatches.map((w) => w.id).join('+'), rule_ids: [] },
    ...(advice.length ? [{ slot: '時間', text: `時間上，${advice.join('；')}。`, source_id: null, rule_ids: [] }] : []),
    { slot: '留白', text: EPILOGUE_CLOSE, source_id: null, rule_ids: [] },
  ];
  return { slug: EPILOGUE_SLUG, title: EPILOGUE_SLUG, segments };
}
