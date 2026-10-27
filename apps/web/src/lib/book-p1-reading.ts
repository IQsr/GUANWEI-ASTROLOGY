import 'server-only';
import data from './book-p1-reading.json';
import {BOOK_P1_CARDS,LIAN_KEWEN,TONG_JI,type RuleDecision} from '@guanwei/content/analysis-record';
import {citation} from '@guanwei/content';
import type {ClaimLink} from '@guanwei/content/analysis-contract';
import type {ChapterReading} from './chapter-reading';
type Segment=ChapterReading['segments'][number];
type Chapter={slug:string;title?:string;text:string;slots:string[];reading?:ChapterReading};
const unique=<T,>(a:readonly T[])=>[...new Set(a)];
type Part={heading:string;text:string;focus:readonly string[]};
const copy={[LIAN_KEWEN]:data.lian,[TONG_JI]:data.tong};

function references(ids:readonly string[],focus:readonly string[]):ClaimLink['references']{
 return ids.flatMap(citationId=>(citation(citationId)?.quoteParts??[]).flatMap(part=>{
  const blocks=part.blockIds??[part.id];
  const role:ClaimLink['references'][number]['role']=blocks.some(id=>focus.includes(id))?'direct'
   :citationId.endsWith('kewen-membership')?'required'
   :blocks.some(id=>['wtz.deep.p574.b001','wtz.deep.p116.b012'].includes(id))?'exception'
   :blocks.some(id=>['wtz.deep.p573.b011','wtz.deep.p573.b015','wtz.deep.p574.b002','wtz.deep.p116.b003','wtz.deep.p116.b011'].includes(id))?'required':'comparison';
  return [{citationId,role,blockIds:blocks}];
 }));
}
function paragraph(decision:RuleDecision,part:Part,old:readonly Segment[]=[],asBackground=false):Segment{
 const card=BOOK_P1_CARDS.find(c=>c.id===decision.id)!;
 const applicability=[card.scope,data.common.actualPrefix+((decision.checks as {bindings?:{note:string}[]}).bindings??[]).map(b=>b.note).filter((n,i,a)=>a.indexOf(n)===i).join('；')];
 const rows=old.flatMap(s=>s.statements??[]);
 const inherited=unique([...old.flatMap(s=>s.referenceConditions??[]),...old.flatMap(s=>s.referenceApplicability??[])]);
 const backgroundIds=unique(rows.flatMap(l=>l.citations)).filter(id=>!decision.sourceIds.includes(id));
 return {slot:old[0]?.slot??'解讀',heading:part.heading,text:part.text,
  referenceApplicability:applicability,
  referenceConditions:unique([...decision.conditions,...decision.exceptions,...(asBackground?[]:inherited)]),
  ...(asBackground?{referenceBackground:[{...data.common.background,conditions:inherited.filter(note=>![...decision.conditions,...decision.exceptions,...applicability].includes(note)),citationIds:backgroundIds}]}:{}),
  referenceFocus:[...part.focus],analysisLinks:{decisionIds:[decision.id],references:references(decision.sourceIds,part.focus)},
  statements:[{text:part.text,en:'',kind:'editorial-explanation',source_ids:[decision.id,...unique(rows.flatMap(l=>l.source_ids))],citations:unique([...decision.sourceIds,...rows.flatMap(l=>l.citations)])}]};
}
function advice(d:RuleDecision,text:string):Segment{return {slot:'建議',heading:data.common.adviceHeading,text,analysisLinks:{decisionIds:[d.id]},statements:[{text,en:'',kind:'editorial-advice',source_ids:[`editorial.advice.${d.id}`],citations:[]}]};}
const isAdvice=(s:Segment)=>s.statements?.some(l=>l.kind==='editorial-advice'&&l.source_ids.some(id=>id.startsWith('editorial.advice.')))??false;
function update(ch:Chapter,segments:Segment[]):Chapter{
 if(!ch.reading)throw Error(`P1 requires saved reading: ${ch.slug}`);
 return {...ch,text:segments.map(s=>s.text).join('\n\n'),slots:segments.map(s=>s.slot),reading:{...ch.reading,segments}};
}

/** Explicit supported decisions select body and advice together, for every matching chart. */
export function withBookP1Chapters(book:Chapter[],decisions:readonly RuleDecision[],allDecisions:readonly RuleDecision[]=decisions):Chapter[]{
 return book.map(ch=>{
  const d=decisions.find(d=>d.status==='supported'&&d.chapters.includes(ch.slug==='性格的骨架'?'命宮':ch.slug));
  if(!d||!ch.reading)return ch;
  const selected=copy[d.id as keyof typeof copy];if(!selected)return ch;
  const old=ch.reading.segments;
  const sourced=old.filter(s=>s.statements?.some(l=>l.citations.length));
  if(ch.slug==='福德'||ch.slug==='命宮'){
   const body=selected.body.map((p,i)=>paragraph(d,p,i===0?sourced:[]));
   const retained=old.filter(s=>!sourced.includes(s)&&!isAdvice(s));
   return update(ch,[...body,advice(d,selected.advice),...retained]);
  }
  if(d.id===TONG_JI&&ch.slug==='性格的骨架'){
   let i=0;return update(ch,old.map(s=>sourced.includes(s)?paragraph(d,copy[TONG_JI].bone[Math.min(i++,1)]!,[s]):s));
  }
  if(d.id===TONG_JI&&ch.slug==='官祿'){
   const generic=sourced.at(-1)!;
   const stable=old.find(s=>s.statements?.some(l=>l.source_ids.includes('career-ji-quan')));
   const stableDecision=allDecisions.find(v=>v.ruleId==='career-ji-quan'&&v.chapters.includes('官祿')&&v.status==='supported');
   if(!stable||!stableDecision)throw Error('Missing selected native career-ji-quan decision');
   // hedge-relocation-v6 可能已刪走通用細讀（盤上冇嘅化），咁就只合天機化權嗰段
   const combined=paragraph(d,copy[TONG_JI].career,stable===generic?[stable]:[stable,generic]);
   combined.analysisLinks!.decisionIds=[d.id,stableDecision.id];
   const guidance=advice(d,copy[TONG_JI].careerAdvice);guidance.analysisLinks!.decisionIds=[d.id,stableDecision.id];
   return update(ch,old.flatMap(s=>s===stable?[combined]:s===generic?[]:isAdvice(s)?[guidance]:[s]));
  }
  return ch;
 });
}

/** Closing selection uses the same verdict and declared chapter links, never a prose prefix. */
export function withBookP1Epilogue(book:Chapter[],decisions:readonly RuleDecision[],allDecisions:readonly RuleDecision[]=decisions):Chapter[]{
 const old=book.find(c=>c.slug==='給你的話');if(!old?.reading)return book;
 let segments=old.reading.segments;
 for(const d of decisions.filter(d=>d.status==='supported')){
  const selected=copy[d.id as keyof typeof copy];if(!selected)continue;
  const closing=selected.ending,anchor=d.id===LIAN_KEWEN?'福德':'命宮';
  const index=segments.findIndex(s=>s.statements?.some(l=>l.source_ids.some(id=>id.startsWith('epilogue.selected.')&&id.slice('epilogue.selected.'.length).split('.').includes(anchor))));
  if(index<0)throw Error(`Missing declared upstream closing for ${d.id}`);
  const previous=segments[index]!;
  const part=paragraph(d,{heading:closing.heading,text:closing.text,focus:[...BOOK_P1_CARDS.find(c=>c.id===d.id)!.directBlocks,...(d.id===TONG_JI?['wtz.deep.p522.b007']:[])]},[previous],d.id===LIAN_KEWEN);
  const stable=d.id===TONG_JI?allDecisions.find(v=>v.ruleId==='career-ji-quan'&&v.chapters.includes('官祿')&&v.status==='supported'):undefined;
  part.analysisLinks={...part.analysisLinks!,decisionIds:[d.id,...(stable?[stable.id]:[])],upstreamFocusIds:closing.names.map(n=>`focus:${n}:selected`)};
  part.statements=part.statements!.map(l=>({...l,source_ids:[d.id,`epilogue.selected.${closing.names.join('.')}`,...l.source_ids.filter(id=>id!==d.id&&!id.startsWith('epilogue.selected.'))]}));
  segments=segments.map((s,i)=>i===index?part:s);
 }
 return segments===old.reading.segments?book:book.map(c=>c===old?update(c,segments):c);
}
