import { annual, type AnnualChart, type Chart, type Sihua } from '@guanwei/ziwei';
import { FORBIDDEN_TERMS } from './frame';
import { palaceLabel } from './link';
import { leanOf, xingxiOf } from './xingxi';
import { DAXIAN_HUA, DAXIAN_RULES, adviceSegment, area, areaSegments, decadeView, num, pivotRule, starsOf, yearCN, type DaxianSegment } from './daxian';

/* ───────────────────────────────────────────────────────────
 * 流年章〈這一年〉（2026-09-30）
 *
 * 讀法跟《深造講義》p.235：「推斷流年時，一共有三組四化……其實通常只需視大限及流年兩組化曜。
 * 當生年四化被沖會之時，然後始須注意，不沖起則作用甚小。」
 *
 *   結論     流年祿、忌落喺今年邊一宮
 *   流年     流年命宮（太歲宮）落本命邊宮、大限邊宮、坐乜星；當命宮讀（六十星系，用流年四化）
 *   四化     流年四化逐粒講（同大限一樣嘅講法，p.238–313）
 *   互動     流年四化碰大限四化；冇碰大限先睇本命（規則同大限，p.235–237）
 *   明年     下一年嘅流年命宮同祿忌
 *   樞紐     下篇「以某某宮垣為流年／年限樞紐」：今年流年命宮落正樞紐就講明
 *
 * ⚠ 本書寫咗唔變（R-008），寫「寫這本書的這一年」；唔預測事件、唔講病、唔講金額。
 * ⚠ 書入面大量用流羊、流陀（流年祿存、羊陀），引擎未排，唔講。
 * ─────────────────────────────────────────────────────────── */

export const YEAR_SLUG = '這一年';

export const LIUNIAN_CLOSE = '一年很快過去。把力氣放在順的地方，對要留神的事慢一步，就是這一年最實在的做法。';
{
  const bad = FORBIDDEN_TERMS.filter((w) => LIUNIAN_CLOSE.includes(w));
  if (bad.length) throw new Error(`流年章框唔准講命理：${bad.join('、')}`);
}

const NONE_TEXT = '這一年的四化，沒有碰到你大限或本命的四化：不沖起，作用就小，今年的起落多半只在表面。';

type Hit = { star: string; hua: Sihua; annualPalace: string | null };

function hitsOf(A: AnnualChart): Hit[] {
  return A.sihua.annual.map((h) => ({ star: h.star, hua: h.hua, annualPalace: h.annualPalace }));
}

/** 流年四化碰到大限四化（優先）或者本命四化，套 p.235–237 嗰幾條規則 */
function interplay(A: AnnualChart): { text: string; ids: string[] } {
  const dec = new Map((A.sihua.decadal ?? []).map((h) => [h.star, h.hua]));
  const nat = new Map(A.sihua.natal.map((h) => [h.star, h.hua]));
  const lines: string[] = [];
  const ids: string[] = [];
  for (const h of A.sihua.annual) {
    const base = dec.get(h.star) ? { hua: dec.get(h.star)!, who: '在這十年的大限' } : nat.get(h.star) ? { hua: nat.get(h.star)!, who: '在你本命' } : null;
    if (!base) continue;
    const r = DAXIAN_RULES.rules.find((x) => x.natal === base.hua && x.decade === h.hua);
    if (!r) continue;
    lines.push(r.text.replace('{star}', h.star).replace('在你本命', base.who).replace('這十年又', '這一年又').replace('這十年卻', '這一年卻'));
    ids.push(r.id);
  }
  return { text: lines.join(''), ids };
}

export function yearChapter(input: { chart: Chart; year: number }): { slug: string; title: string; segments: DaxianSegment[] } | null {
  const { chart, year } = input;
  const a = annual(chart, year);
  if (!a.ok) return null;
  const A = a.value;
  const [gan, zhi] = A.ganzhi;
  const hits = hitsOf(A);
  const lu = hits.find((h) => h.hua === '祿');
  const ji = hits.find((h) => h.hua === '忌');
  if (!lu || !ji) return null;

  const ov = A.overlay.find((o) => o.branch === A.mingGong)!;
  const mp = chart.palaces.find((p) => p.branch === A.mingGong)!;
  const pivot = pivotRule(chart, 'year');
  const isKey = pivot?.isPivot(mp) ?? false;

  /* 結論 */
  const young = A.nominalAge <= 16 ? '你還年少，下面講的是這一年身邊的環境。' : '';
  const gist =
    lu.annualPalace && lu.annualPalace === ji.annualPalace
      ? `這一年，你的${area(lu.annualPalace)}起伏較大，有得著，也有牽掛。`
      : `這一年，你的${area(lu.annualPalace)}比較順，${area(ji.annualPalace)}要多留神。`;
  const lead =
    `寫這本書的${yearCN(year)}年是${gan}${zhi}年，你虛歲${num(A.nominalAge)}。` +
    gist +
    young +
    (isKey ? '這一年是你命盤裡的關鍵年份之一，今年的得失，影響會比一般年份深。' : '');

  /* 流年命宮 */
  const dec = ov.decadal ? `，也就是這十年大限的${palaceLabel(ov.decadal)}` : '';
  const fact = `這一年的流年命宮在${A.mingGong}，落在你本命的${palaceLabel(ov.natal)}${dec}，${starsOf(chart, mp)}。`;
  const view = decadeView(chart, A.mingGong, hits);
  const x = xingxiOf(view);
  const leanLine = x ? `這一年裡，${x.system.plain.lean[leanOf(view, x.system).pole]}` : '';

  /* 分四方面（工作、錢、感情、心境）：讀流年盤嘅官祿、財帛、夫妻、福德 */
  const periodHits = hits.map((h) => ({ star: h.star, hua: h.hua, palace: h.annualPalace }));
  const areas = areaSegments(chart, (b) => A.overlay.find((o) => o.branch === b)?.annual ?? null, periodHits, '這一年');
  const advice = adviceSegment(periodHits, '這一年');

  /* 流年四化（四方面已經講咗嘅唔再講） */
  const huaLines = hits.filter((h) => !areas.used.has(`${h.star}${h.hua}`)).map((h) => {
    const m = DAXIAN_HUA.find((e) => e.star === h.star && e.hua === h.hua);
    const where = h.annualPalace ? `（在這一年的${palaceLabel(h.annualPalace)}）` : '';
    return { text: m ? `${h.star}化${h.hua}${where}：${m.text}` : '', id: m?.id ?? null };
  });

  /* 互動 */
  const inter = interplay(A);
  const touched = A.sihua.annual.some(
    (h) => (A.sihua.decadal ?? []).some((d) => d.star === h.star) || A.sihua.natal.some((n) => n.star === h.star),
  );
  const interSeg = inter.text ? { text: inter.text, id: inter.ids.join('+') } : touched ? null : { text: NONE_TEXT, id: DAXIAN_RULES.none.id };

  /* 明年 */
  let nextLine = '';
  const nb = annual(chart, year + 1);
  if (nb.ok) {
    const N = nb.value;
    const np = chart.palaces.find((p) => p.branch === N.mingGong)!;
    const nov = N.overlay.find((o) => o.branch === N.mingGong)!;
    const nlu = N.sihua.annual.find((h) => h.hua === '祿');
    const nji = N.sihua.annual.find((h) => h.hua === '忌');
    const nkey = pivot?.isPivot(np) ? '這也是你命盤裡的關鍵年份。' : '';
    nextLine =
      `${yearCN(year + 1)}年是${N.ganzhi[0]}${N.ganzhi[1]}年，流年命宮轉到${N.mingGong}，落在你本命的${palaceLabel(nov.natal)}，${starsOf(chart, np)}` +
      (nlu && nji ? `；那一年${nlu.star}化祿、${nji.star}化忌。` : '。') +
      nkey;
  }

  const seg = (slot: string, text: string, source_id: string | null = null): DaxianSegment => ({ slot, text, source_id, rule_ids: [] });
  const segments = [
    seg('結論', lead, isKey ? pivot!.source : null),
    seg('流年', fact + leanLine, x ? `xingxi.${x.system.n}` : null),
    ...areas.segments,
    seg('四化', huaLines.length && areas.segments.length ? `其餘的四化：${huaLines.map((l) => l.text).join('')}` : huaLines.map((l) => l.text).join(''), huaLines.map((l) => l.id).filter(Boolean).join('+') || null),
    ...(interSeg ? [seg('互動', interSeg.text, interSeg.id)] : []),
    ...(advice ? [advice] : []),
    ...(nextLine ? [seg('明年', nextLine)] : []),
    seg('留白', LIUNIAN_CLOSE),
  ].filter((s) => s.text.trim() !== '');
  return { slug: YEAR_SLUG, title: YEAR_SLUG, segments };
}
