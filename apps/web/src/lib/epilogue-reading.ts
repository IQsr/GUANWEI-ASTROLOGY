import {xingxiOf,citation} from '@guanwei/content';
import type {Chart} from '@guanwei/ziwei';
import type {ChapterReading} from './chapter-reading';
import {EPILOGUE_READER_VERSION} from './reader-release';
import copy from './epilogue-reading.json';

type Segment=ChapterReading['segments'][number];
type Chapter={slug:string;title?:string;text:string;slots:string[];reading?:ChapterReading};
const unique=<T,>(items:readonly T[])=>[...new Set(items)];
const sourced=(s:Segment)=>s.statements?.some(l=>l.citations.length)??false;
const sourceRows=(book:readonly Chapter[],names:readonly string[])=>names.flatMap(name=>book.find(c=>c.slug===name)?.reading?.segments.filter(sourced)??[]);

/** Reviewed advice, transitions and reference deduplication; branch selection and source quotes stay intact. */
export function alignReviewedChapters(chart:Chart,book:Chapter[]):Chapter[]{
 const system=xingxiOf(chart);if(!system||system.borrowed)return book;
 const n=system.system.n;
 return book.map(ch=>{
  if(!ch.reading)return ch;
  let segments=ch.reading.segments;
  const advice=(copy.advice as Record<string,string>)[String(n)]??null;
  if(ch.slug==='命宮'&&advice)segments=segments.map(s=>s.statements?.some(l=>l.kind==='editorial-advice'&&l.source_ids.some(id=>id.startsWith(`editorial.advice.${ch.slug}.`)))?{...s,text:advice,statements:[{text:advice,en:'',kind:'editorial-advice',source_ids:[`editorial.advice.aligned.${n}`],citations:[]}]}:s);
  // Replace only the reviewed transition statement, preserving its sources and scope.
  if(ch.slug==='性格的骨架'&&n===17)segments=segments.map(s=>{
   if(!s.statements?.some(l=>l.source_ids.includes('TL-B2')))return s;
   const statements=s.statements.map(l=>l.source_ids.includes('TL-B2')?{...l,text:copy.tongliangBone}:l);
   return {...s,text:statements.map(l=>l.text).join(''),statements};
  });
  // The two source paragraphs state the same helpers distinction. Keep their complete reference bundles.
  if(ch.slug==='官祿'&&n===45){
   const index=segments.findIndex(s=>s.heading===copy.helperDuplicate.targetHeading);
   const duplicate=segments.findIndex(s=>s.heading===copy.helperDuplicate.duplicateHeading&&s.text===copy.helperDuplicate.text);
   if(index>=0&&duplicate>=0){
    const target=segments[index]!,old=segments[duplicate]!;
    const lines=[...(target.statements??[]),...(old.statements??[])];
    segments=segments.flatMap((s,i)=>i===duplicate?[]:i===index?[{...target,
     referenceConditions:unique([...(target.referenceConditions??[]),...(old.referenceConditions??[])]),
     referenceApplicability:unique([...(target.referenceApplicability??[]),...(old.referenceApplicability??[])]),
     referenceFocus:unique([...(target.referenceFocus??[]),...(old.referenceFocus??[])]),
     statements:[{text:target.text,en:'',kind:'editorial-explanation',source_ids:unique(lines.flatMap(l=>l.source_ids)),citations:unique(lines.flatMap(l=>l.citations))}]
    }]:[s]);
   }
  }
  return segments===ch.reading.segments?ch:{...ch,text:segments.map(s=>s.text).join('\n\n'),slots:segments.map(s=>s.slot),reading:{...ch.reading,segments}};
 });
}

/** Summarize the final selected reading, never legacy poles, plain summaries or a count of good/bad stars. */
export function withReadingEpilogue(chart:Chart,book:Chapter[]):Chapter[]{
 const old=book.find(c=>c.slug==='給你的話');if(!old)return book;
 const x=xingxiOf(chart);
 const profiles=copy.profiles as Record<string,{heading:string;text:string;chapters:string[]}[]>;
 const profile=x&&!x.borrowed?profiles[String(x.system.n)]:undefined;
 // The profile summarizes only these native major structures. No borrowed structure is promoted to a native one.
 const native=(name:string,stars:string[])=>{
  const p=chart.palaces.find(p=>p.name===name);
  return !!p&&!p.borrowsFrom&&p.stars.filter(s=>s.kind==='major').map(s=>s.name).sort().join('+')===[...stars].sort().join('+');
 };
 const expected:Record<string,[string[],string[],string[]]>={
  '54':[['武曲','貪狼'],['紫微','七殺'],['天府']],
  '45':[['破軍'],['貪狼'],['廉貞']],
  '28':[['天機'],['巨門'],['太陽']],
  '21':[['廉貞','天相'],['武曲'],['貪狼']],
  '39':[['紫微','貪狼'],['廉貞','七殺'],['天府']],
 };
 const structure=x&&expected[String(x.system.n)];
 const eligible=profile&&structure&&['官祿','財帛','福德'].every((name,i)=>native(name,structure[i]!));
 const derived=(text:string,heading:string,names:readonly string[],rows:Segment[]):Segment=>({
  slot:'撮要',heading,text,
  referenceApplicability:[copy.applicability.replace('{chapters}',names.join('、')),...unique(rows.flatMap(s=>s.referenceApplicability??[]))],
  referenceConditions:unique(rows.flatMap(s=>s.referenceConditions??[])),
  referenceFocus:unique(rows.flatMap(s=>s.referenceFocus?.length?s.referenceFocus:(s.statements?.[0]?.citations.slice(0,1).flatMap(id=>citation(id)?.quoteParts?.slice(0,1).flatMap(part=>part.blockIds??[part.id])??[])??[]))),
  statements:[{text,en:'',kind:'editorial-explanation',source_ids:[`epilogue.selected.${names.join('.')}`,...unique(rows.flatMap(s=>s.statements?.flatMap(l=>l.source_ids)??[]))],citations:unique(rows.flatMap(s=>s.statements?.flatMap(l=>l.citations)??[]))}]
 });
 const segments:Segment[]=eligible?profile.flatMap(part=>{
  const rows=sourceRows(book,part.chapters);
  return part.chapters.every(name=>sourceRows(book,[name]).length)?[derived(part.text,part.heading,part.chapters,rows)]:[];
 }):[];
 // Other systems use complete selected paragraphs, keeping their negations and modifiers intact.
 if(!segments.length)for(const {chapter:name,heading} of copy.fallback){
  const rows=sourceRows(book,[name]);if(!rows.length)continue;
  const relevant=rows.filter((s,i)=>i===0||s.text.startsWith('本盤'));
  segments.push(derived(relevant.map(s=>s.text).join(''),heading,[name],rows));
 }
 if(!segments.length)return book;
 const oldParts=old.text.split('\n\n');
 for(const slot of ['時間','留白']){
  const i=old.slots.indexOf(slot);if(i>=0&&oldParts[i])segments.push({slot,text:oldParts[i]!,statements:[{text:oldParts[i]!,en:'',kind:'editorial-advice',source_ids:[`epilogue.retained.${slot}`],citations:[]}]});
 }
 const original={text:old.text,slots:[...old.slots],...(old.reading?{reading:old.reading}:{})};
 const reading:ChapterReading={format:'ming-expanded-v1',writer:EPILOGUE_READER_VERSION,segments,international:{text:old.text,slots:[...old.slots]},internationalSnapshot:original};
 return book.map(ch=>ch===old?{...old,text:segments.map(s=>s.text).join('\n\n'),slots:segments.map(s=>s.slot),reading}:ch);
}
