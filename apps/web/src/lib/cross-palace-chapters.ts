import {referenceEditorialWording} from './cross-reference-language';
import {analyzeCrossPalaces} from '@guanwei/content/engine-p1-cross';
import {isSchoolReader,isYouthReader,type MingStatement,readerReferenceLanguage} from '@guanwei/content';
import type {Chart} from '@guanwei/ziwei';
import type {ChapterReading} from './chapter-reading';
import data from './cross-palace-reading.json';

export const CROSS_READING_VERSION='cross-palace-reading-v1';
const copy=data.presentation;
export type CrossAnalysis=ReturnType<typeof analyzeCrossPalaces>;
type Segment=ChapterReading['segments'][number];
const union=<T,>(items:T[])=>[...new Set(items)];
const sourced=(s:Segment)=>s.statements?.some((l)=>l.citations.length)??false;
const readerNote=(s:string)=>copy.noteReplacements.reduce((text,[before,after])=>text.replaceAll(before!,after!),readerReferenceLanguage(referenceEditorialWording(s)));

/** Selected while creating new books; all source/condition gates remain required. Saved chapters are never recalculated. */
export function withCrossPalaceReading(chart:Chart,palace:string,year:number,input:Segment[],analysis:CrossAnalysis,opts:{ageBands?:boolean}={}):Segment[]{
  if(analysis.integrity.status!=='matched')return input;
  const entry=data.entries.find((e)=>e.family===analysis.family&&e.palace===palace);
  if(!entry||!entry.requires.every((id)=>analysis.results.some((r)=>r.id===id&&r.status==='supported'))
    ||!entry.requiredPrior.every((id)=>analysis.priorAnalysis.results.some((r)=>r.id===id&&r.status==='supported'))
    ||('requiredYearStem' in entry&&entry.requiredYearStem!==chart.ganzhi.year[0]))return input;
  if(!entry.nativeNoHua.every((star)=>analysis.facts.some((f)=>f.position.star===star&&f.position.status==='available'&&!f.position.placement.sihua)))return input;
  if(!entry.parts.every((p)=>p.priorRequired.every((id)=>analysis.priorAnalysis.results.some((r)=>r.id===id&&r.status==='supported'))))return input;
  const sourceRows=input.filter(sourced);
  const inherited=union(entry.parts.flatMap((p)=>p.inherit));
  if(inherited.some((i)=>!sourceRows[i]))return input;
  const frame=(name:string)=>analysis.frames.find((f)=>f.palace===name)!;
  const values:Record<string,string>={ming:frame(copy.palaces.ming).branch!,career:frame(copy.palaces.career).branch!,wealth:frame(copy.palaces.wealth).branch!,wellbeing:frame(copy.palaces.wellbeing).branch!,careerOrigin:frame(copy.palaces.career).reference?.origin?.branch??''};
  const fill=(s:string)=>s.replace(/\{([^}]+)\}/g,(_,key:string)=>{if(!(key in values))throw Error(`Unknown cross-reading token: ${key}`);return values[key]!;});
  const aliases=data.citationAliases as Record<string,string>;
  const rows:Segment[]=entry.parts.map((part,i)=>{
    const old=part.inherit.map((index)=>sourceRows[index]!);
    const rules=part.ruleIds.map((id)=>analysis.results.find((r)=>r.id===id)!);
    const text=fill(part.text),citations=union([...old.flatMap((s)=>s.statements?.flatMap((l)=>l.citations)??[]),...part.citations].map((id)=>aliases[id]??id));
    const statements:MingStatement[]=[{text,en:'',kind:'editorial-explanation',source_ids:[`cross.reading.${entry.id}.${i}`,...union(old.flatMap((s)=>s.statements?.flatMap((l)=>l.source_ids)??[]))],citations}];
    const applicable=union(rules.flatMap((r)=>r.palaces)).map((name)=>{
      const f=frame(name);
      const majors=f.nativeMajors.map((m)=>`${m.star}${m.hua?`${copy.hua}${m.hua}`:''}`).join(copy.starSeparator);
      return majors?`${name}${f.branch}${copy.native}${majors}`:`${name}${f.branch}${copy.emptyBorrow}${f.reference?.origin?.palace}${f.reference?.origin?.branch}${copy.possessive}${f.reference?.majors.map((m)=>m.star).join(copy.starSeparator)}${copy.asReference}`;
    }).join(copy.palaceSeparator);
    return {slot:copy.slots[i===0?0:1]!,heading:part.heading,text,statements,
      referenceFocus:[...part.referenceFocus],
      referenceApplicability:[`${copy.scopePrefix}${applicable}${copy.fullStop}`,...part.notes.map(fill),copy.method],
      referenceConditions:union([...old.flatMap((s)=>s.referenceConditions??[]),...old.flatMap((s)=>s.referenceApplicability??[]),
        ...rules.flatMap((r)=>[...r.conditions,...r.exceptions]),...part.notes.map(fill)]).map(readerNote)};
  });
  // Preserve any extra, already reviewed modifier (e.g. 財帛地空 or 子午天機開創限制).
  const kept=sourceRows.filter((_,i)=>!inherited.includes(i)).map((row)=>({...row,statements:row.statements?.map((line)=>({...line,citations:line.citations.map((id)=>aliases[id]??id)}))}));
  const tail=input.filter((s)=>!sourced(s)).map((s)=>{
    if(!s.statements?.some((l)=>l.source_ids.some((id)=>id.startsWith('editorial.advice.'))))return s;
    const young=opts.ageBands?isSchoolReader(chart,year):isYouthReader(chart,year);
    const text=('youthAdvice' in entry&&young?entry.youthAdvice:entry.advice)??entry.advice;
    return {...s,text,statements:[{text,en:'',kind:'editorial-advice' as const,source_ids:[`editorial.advice.cross.${entry.id}`],citations:[]}]};
  });
  return [...rows,...kept,...tail];
}

export {analyzeCrossPalaces};
