import { monthly, monthsOf, type AnnualChart, type Branch, type Chart } from '@guanwei/ziwei';
import { CORPUS, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';

/* ───────────────────────────────────────────────────────────
 * 〈這一年〉逐月（2026-10-06 · Issac：流月放入「這一年」做一段逐月）
 *
 * 出處：《紫微斗數全書》卷二（維基文庫本，公有領域）
 *   〈安斗君訣〉「於流年太歲宮起正月，逆至本生月，又從本生月起子順數至本生時安斗君」
 *   —— 引擎 `monthly()`：斗君係正月，之後每月順行一宮。
 *   十二宮每宮一句「斗君過度」：例如財帛「斗君遇吉其月發財。遇凶惡空劫耗忌星其月損財」。
 *
 * ── 讀法 ──
 *   流月命宮落喺**今年流年盤**邊一宮，嗰個月就講嗰方面（斗君係流年嘅結構，所以用流年宮名）。
 *   吉凶照全書「遇吉 / 遇凶殺」：
 *     吉 —— 本命吉星（紫府、昌曲、左右、魁鉞、祿存），加今年流年化祿、化權、化科落喺嗰宮
 *     凶 —— 本命煞星（羊陀火鈴、空劫），加今年流羊流陀、流年化忌（全書財帛句：「空劫耗忌」）
 *   相差兩粒或以上先算偏吉／偏凶；其餘歸「大致平穩」，唔逐個月寫。
 *
 * ⚠ 呢一章講將來：唔講身體（疾厄宮凶只講「步調放慢」）、唔預測六親（兄弟、子女、父母只講相處）。
 * ⚠ 閏月（Issac：照通行做法）：上半月當本月，下半月當下一個月。
 * ─────────────────────────────────────────────────────────── */

type Entry = { palace: string; good: string; bad: string; quote: string };

/* 每宮兩句（吉、凶），對住全書嗰宮嘅「斗君」句；quote 一定要喺原文（下面 load 時核） */
const ENTRIES: Entry[] = [
  { palace: '命宮', good: '整體順手，想做的事可以推進', bad: '整體多些阻滯，凡事穩一點', quote: '遇吉斷吉，遇凶斷凶' },
  { palace: '兄弟', good: '和兄弟姊妹、朋友相處融洽', bad: '和兄弟姊妹、朋友說話多留餘地', quote: '逢吉星兄弟一年和睦' },
  { palace: '夫妻', good: '感情上相處融洽', bad: '感情上多些體諒，少些計較', quote: '斗君過度在妻宮逢吉星' },
  { palace: '子女', good: '和晚輩相處愉快', bad: '對晚輩的事多些耐心', quote: '斗君在子女宮過度' },
  { palace: '財帛', good: '錢財上有進帳的機會', bad: '錢財上看緊一點，別為錢起口角', quote: '斗君遇吉其月發財' },
  { palace: '疾厄', good: '身心安穩，作息容易上軌道', bad: '步調放慢一點，給自己留些餘裕', quote: '斗君遇吉身心安寧' },
  { palace: '遷移', good: '出外走動有收穫', bad: '出外辦事多一分耐心，少和人爭執', quote: '斗君過度遇吉動中吉' },
  { palace: '僕役', good: '同事、朋友幫得上手', bad: '人際上少捲入是非', quote: '斗君過度逢吉星則奴僕歸順' },
  { palace: '官祿', good: '工作上順手，付出看得見回報', bad: '工作上奔波多，按部就班較好', quote: '斗君遇吉其年月財官旺' },
  { palace: '田宅', good: '家居、置業的事進展順利', bad: '家裡的開支先做好預算', quote: '斗君過度遇吉星其年田產倍進' },
  { palace: '福德', good: '心境平和，做事也定', bad: '心情容易浮動，留點時間給自己', quote: '斗君遇吉其年安靜' },
  { palace: '父母', good: '和長輩相處愉快', bad: '和長輩多溝通，少些硬碰', quote: '斗君過度逢吉父母吉利' },
];

export const LIUYUE = ENTRIES.map((e) => ({ ...e, id: `liuyue.${e.palace}`, passage: `palace.${e.palace}` }));

for (const e of LIUYUE) {
  const p = CORPUS.quanshu?.passages[e.passage];
  if (!p) throw new Error(`逐月：全書搵唔到 ${e.passage}`);
  if (!normaliseForMatch(p.text).includes(normaliseForMatch(e.quote))) throw new Error(`逐月：引文「${e.quote}」唔喺 ${e.passage}`);
  for (const t of [e.good, e.bad]) {
    const bad = [...scanForbidden(t, 'body'), ...scanPlain(t, 'body')];
    if (bad.length) throw new Error(`逐月「${t}」：${bad.map((f) => f.message).join('；')}`);
  }
}

export const MONTH_CN = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'] as const;

export const LIUYUE_LEAD = '按農曆逐月來看，這一年較順和要多留神的月份如下。';
export const LIUYUE_REST = '其餘月份大致平穩。';
export const LIUYUE_FLAT = '按農曆逐月來看，這一年沒有特別起伏的月份，大致平穩。';

const GOOD = ['紫微', '天府', '文昌', '文曲', '左輔', '右弼', '天魁', '天鉞', '祿存'];
const SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];

export type MonthLine = { month: number; palace: string; tone: 'good' | 'bad'; text: string; id: string };

/** 今年十二個月入面，偏吉、偏凶嘅月份（按月份排）。 */
export function monthLines(chart: Chart, A: AnnualChart): MonthLine[] {
  const out: MonthLine[] = [];
  for (let m = 1; m <= 12; m++) {
    const b: Branch = monthly(chart, A.lunarYear, m).mingGong;
    const palace = A.overlay.find((o) => o.branch === b)?.annual;
    const e = LIUYUE.find((x) => x.palace === palace);
    if (!e) continue;
    const natal = chart.palaces.find((p) => p.branch === b)!.stars.map((s) => s.name);
    const hua = A.sihua.annual.filter((h) => h.branch === b);
    const good = natal.filter((s) => GOOD.includes(s)).length + hua.filter((h) => h.hua !== '忌').length;
    const bad =
      natal.filter((s) => SHA.includes(s)).length +
      (A.liuyao.annual.擎羊 === b ? 1 : 0) +
      (A.liuyao.annual.陀羅 === b ? 1 : 0) +
      hua.filter((h) => h.hua === '忌').length;
    if (good - bad >= 2) out.push({ month: m, palace: e.palace, tone: 'good', text: `${MONTH_CN[m]}：${e.good}。`, id: e.id });
    else if (bad - good >= 2) out.push({ month: m, palace: e.palace, tone: 'bad', text: `${MONTH_CN[m]}：${e.bad}。`, id: e.id });
  }
  return out;
}

/** 今年有冇閏月；有就講明點歸（上半月當本月，下半月當下一個月）。 */
export function leapNote(lunarYear: number): string {
  const leap = monthsOf(lunarYear)?.find((x) => x.isLeap)?.month;
  if (!leap) return '';
  const next = leap === 12 ? '正月' : MONTH_CN[leap + 1];
  return `今年有閏${MONTH_CN[leap]}：上半月照${MONTH_CN[leap]}看，下半月照${next}看。`;
}

/** 〈這一年〉嘅逐月段。 */
export function monthSegment(chart: Chart, A: AnnualChart): { text: string; source_id: string | null } {
  const lines = monthLines(chart, A);
  const leap = leapNote(A.lunarYear);
  if (!lines.length) return { text: LIUYUE_FLAT + leap, source_id: 'liuyue.命宮' };
  const rest = lines.length < 12 ? LIUYUE_REST : '';
  return {
    text: LIUYUE_LEAD + lines.map((l) => l.text).join('') + rest + leap,
    source_id: [...new Set(lines.map((l) => l.id))].join('+'),
  };
}
