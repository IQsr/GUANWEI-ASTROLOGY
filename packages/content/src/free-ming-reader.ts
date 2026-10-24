import { BRANCHES, sanFangPalaces, queryNatalStar, type Chart, type Palace } from '@guanwei/ziwei';
import { evaluate, type Condition } from './condition';
import { xingxiOf } from './xingxi';
import { isYouthReader } from './youth';
import type { MingStatement } from './ming-writer';
import { freeMingCiteId } from './free-ming-sources';
import data from './cards/free-ming-reading.json';
import { systemMingReading } from './free-ming-systems';

export type FreeReadingSegment = { slot: string; text: string; heading?: string; referenceConditions?: string[]; statements: MingStatement[] };
type Row = { zh: string; kind: MingStatement['kind']; heading?: string | null; sources: string[]; referenceConditions?: string[]; adult_only?: boolean; youth_only?: boolean };
const entries = data.entries as Record<string, Row>;
const harsh = ['擎羊', '陀羅', '火星', '鈴星'];

/**
 * 六十星系閱讀稿：三組沿用專用核讀分支，其餘及借星交由共同閱讀層。
 * 按實際條件選段，不按出生日期或舊點票定極。
 * 只供成書時呼叫；舊書永遠讀其正文／註資料快照。
 */
export function freeMingReading(chart: Chart, year: number): { ming: FreeReadingSegment[]; bone: FreeReadingSegment[] } | null {
  const x = xingxiOf(chart);
  if (!x) return null;
  if (x.borrowed || ![17, 55, 60].includes(x.system.n)) return systemMingReading(chart, year);
  const m = chart.palaces.find((p) => p.name === '命宮')!;
  const at = (offset: number) => chart.palaces.find((p) => p.branch === BRANCHES[(BRANCHES.indexOf(m.branch) + offset + 12) % 12]);
  const four = sanFangPalaces(chart.palaces, m.branch);
  const youth = isYouthReader(chart, year);
  const has = (p: Palace | undefined, name: string, hua?: string) => Boolean(p && evaluate({ all: [
    { star: name, in: { name: p.name } }, ...(hua ? [{ star: name, hua } as Condition] : []),
  ] }, { chart }).status === 'matched');
  const all = (ps: Palace[], names: string[]) => names.every((name) => queryNatalStar(chart, name, { branches: ps.map((p) => p.branch) }).status === 'present');
  const row = (id: string, slot: string): FreeReadingSegment | null => {
    const r = entries[id];
    if (!r) throw new Error(`Missing reviewed reading: ${id}`);
    if ((r.adult_only && youth) || (r.youth_only && !youth)) return null;
    const text = r.zh.replaceAll('{branch}', m.branch);
    return { slot, text, ...(r.heading ? { heading: r.heading } : {}),
      ...(r.referenceConditions?.length ? { referenceConditions: [...r.referenceConditions] } : {}), statements: [{
      text, en: '', kind: r.kind, source_ids: [id], citations: r.sources.map(freeMingCiteId),
    }] };
  };
  const rows = (ids: [string, string][]) => ids.map(([id, slot]) => row(id, slot)).filter((s): s is FreeReadingSegment => s !== null);
  const stars = x.system.stars.join('、');
  const fact = (): FreeReadingSegment => {
    const text = `你的命宮是${stars}${x.system.stars.length === 2 ? '同坐' : '坐'}${m.branch}宮。`;
    return { slot: '因為', text, heading: '盤面依據', statements: [{ text, en: '', kind: 'evidence', source_ids: [], citations: [] }] };
  };

  if (x.system.n === 17) {
    const flanked = (has(at(-1), '擎羊') && has(at(1), '陀羅')) || (has(at(-1), '陀羅') && has(at(1), '擎羊'));
    const special = has(m, '天同', '忌') && flanked;
    // 原書容許祿存同度或對拱；已批稿明列祿存、火星同宮，選段亦須完全相符。
    const fire = special && has(m, '祿存') && has(m, '火星');
    const ming = rows([
      [special ? 'TL-M1' : 'TL-G1', '結論'], [special ? 'TL-M2' : 'TL-G2', '展開'],
      ...(fire && !youth ? [['TL-M3', '展開'] as [string, string]] : []),
      ['TL-M4', '情境'], ['TL-M5', '做法'],
    ]);
    const bone = [fact(), ...rows([
      [special ? (has(m, '火星') ? 'TL-B1' : 'TL-SB') : 'TL-GB', '骨架'],
      ...(fire && !youth ? [['TL-B2', '骨架'] as [string, string]] : []),
      ...(has(m, '天馬') ? [['TL-B3', '骨架'] as [string, string]] : []),
      ['TL-B4', '做法'],
      ...(!youth ? [] : [['JL-B4', '做法'] as [string, string]]),
    ])];
    return { ming, bone };
  }

  if (x.system.n === 55) {
    // 壬干亥府祿存：兩對輔佐齊會及無再夾火鈴，是本次人手核讀的窄分支。
    // 原書「眾多」未改成通用計票閾值；不把其他盤自動判為相反一極。
    const pairs = all(four, ['左輔', '右弼', '天魁', '天鉞']);
    const fireClamp = evaluate({ jia: '天府', sides: [['火星'], ['鈴星']] }, { chart });
    const wealth = chart.palaces.find((p) => p.name === '財帛');
    const borrowed = wealth?.borrowsFrom ? chart.palaces.find((p) => p.branch === wealth.borrowsFrom) : undefined;
    const qualified = chart.ganzhi.year[0] === '壬' && m.branch === '亥' && has(m, '天府', '科') && has(m, '祿存')
      && pairs && has(m, '左輔') && has(chart.palaces.find((p) => p.name === '官祿'), '右弼')
      && has(chart.palaces.find((p) => p.name === '官祿'), '天魁') && has(at(6), '天鉞')
      && fireClamp.status === 'unmatched' && harsh.every((name) => queryNatalStar(chart, name, { branches: four.map((p) => p.branch) }).status === 'absent') && has(borrowed, '武曲', '忌');
    return {
      ming: rows([[qualified ? 'TF-M1' : 'TF-G1', '結論'], [qualified ? 'TF-M2' : 'TF-G2', '展開'], ['TF-M4', '情境'], ['TF-M5', '做法']]),
      bone: [fact(), ...rows(qualified
        ? [['TF-B1', '骨架'], ['TF-B2', '骨架'], ['TF-B3', '骨架'], ['TF-B4', '骨架']]
        : [['TF-GB', '骨架'], ['TF-B4', '骨架']]), ...rows(youth ? [['JL-B4', '做法']] : [])],
    };
  }

  // 機梁的兩端訊號不作相加抵銷。具體列表只在已核配合相同時使用。
  const career = chart.palaces.find((p) => p.name === '官祿');
  const wealth = chart.palaces.find((p) => p.name === '財帛');
  const listed = m.branch === '戌' && has(m, '天梁', '祿') && has(m, '文曲') && has(m, '陀羅') && has(at(6), '文昌') && has(at(6), '鈴星')
    && has(wealth, '天同') && has(wealth, '太陰') && has(wealth, '左輔') && Boolean(career?.borrowsFrom);
  const tongJi = four.some((p) => has(p, '天同', '忌'));
  return {
    ming: rows([['JL-M1', '結論'], [listed ? 'JL-M2' : 'JL-G2', '展開'], ...(tongJi ? [['JL-TJ', '展開'] as [string, string]] : []),
      [youth ? 'JL-M3' : 'JL-ADULT', '情境'], ['JL-M4', '做法']]),
    bone: [fact(), ...rows([...(listed ? [['JL-B1', '骨架'] as [string, string], ['JL-B2', '骨架'] as [string, string]] : [['JL-GB', '骨架'] as [string, string]]),
      ...(tongJi ? [['JL-TJ', '骨架'] as [string, string]] : []), ['JL-B3', '骨架'], ['JL-B4', '做法']])],
  };
}
