import type { Chart } from '@guanwei/ziwei';
import type { FreeReadingSegment } from './free-ming-reader';
import raw from './cards/reading-focus.json';
export type FocusedReadingSegment = FreeReadingSegment & {referenceFocus?:string[];referenceApplicability?:string[]};
type Entry = {original:string;heading:string|null;prose:string};
const entries = raw.entries as Record<string,Entry>;
const direct = raw.direct_blocks as Record<string,string[]>;

/** New-book presentation only. The audited reader still selects the actual branch and its citations. */
export function readingFocus(chart: Chart, palace: string, rows: FreeReadingSegment[]): FocusedReadingSegment[] {
  return rows.map((row) => {
    let heading = row.heading;
    const statements = row.statements.map((line) => {
      const id = line.source_ids.find((id) => entries[id]);
      if (!id || !['命宮','性格的骨架'].includes(palace)) return line;
      const entry = entries[id]!;
      const original=entry.original.replaceAll('{branch}',chart.palaces.find((p)=>p.name==='命宮')!.branch);
      if (!line.text.includes(original)) throw Error(`Reading-focus input changed; re-read: ${id}`);
      if (entry.heading) heading = entry.heading;
      return {...line,text:line.text.replace(original,entry.prose)};
    });
    const ids = statements.flatMap((line) => line.source_ids);
    // The native Wuqu-Ji context takes precedence over the common Wutan enjoyment theme.
    const context = ids.find((id) => id.endsWith('-context-fact') && direct[id]);
    const focus = [...new Set(context ? direct[context]! : ids.flatMap((id) => direct[id] ?? []))];
    const p = chart.palaces.find((p) => p.name === palace);
    const own = p?.stars.filter((s) => s.kind === 'major') ?? [];
    let applicability: string[] = [];
    if (p && ids.some((id) => /^health-天同\+太陰-子午-(base|follow)$/.test(id))) {
      if (!own.length && p.borrowsFrom) applicability = ['本盤疾厄宮空宮借同陰，只參照水濕的基本取象；對宮的配曜與四化不搬入本宮。下引火鈴同度、太陰化忌的兩支，不因借星便適用於本盤；病名與調治原文不作個人診斷或治療建議。'];
      else if (own.some((s) => s.name === '天同') && own.some((s) => s.name === '太陰')) {
        const fire = p.stars.filter((s) => ['火星','鈴星'].includes(s.name)).map((s) => s.name);
        const ji = own.some((s) => s.name === '太陰' && s.sihua === '忌');
        applicability = [`本盤同陰實坐疾厄宮；${fire.length ? `${fire.join('、')}同宮，對應下引火鈴同度一支` : '本宮無火鈴同度，不採下引濕火一支'}；太陰${ji ? '在本宮化忌，另對應陰虛一支' : '未在本宮化忌，不採下引陰虛一支'}。未採某一支不代表已知沒有病患；病名與調治原文不作個人診斷或治療建議。`];
      }
    }
    if (p && ids.some((id) => /^wellbeing-武曲\+貪狼-丑未-(base|follow)$/.test(id))
      && own.some((s) => s.name === '武曲' && s.sihua === '忌') && own.some((s) => s.name === '貪狼')) {
      applicability = [`本盤武曲、貪狼實坐福德宮${p.branch}，武曲在本宮化忌；這裡取物質追求與內心滿足的分別。下引疾病、特別癖好、桃花、科文及火星等描述，各有額外配合；不能只由武曲化忌或武貪同宮套用，亦不作人格或病況判定。`];
    }
    return {...row,heading,statements,text:statements.map((line) => line.text).join(''),
      ...(focus.length ? {referenceFocus:focus} : {}),
      ...(applicability.length ? {referenceApplicability:applicability} : {})};
  });
}
