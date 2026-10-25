import {BRANCHES} from '@guanwei/ziwei/contract';
import type {Chart,BirthInput} from '@guanwei/ziwei/contract';
import type {NatalStarLookup,natalTableCoverage} from '@guanwei/ziwei';
import type {PalacePredicate,PalaceEvaluation} from './palace-predicate';
/** Storage contract, not a new interpretation engine. All verdicts come from existing evaluators. */
export const BOOK_ANALYSIS_VERSION='book-analysis-v1';
export type DecisionStatus='supported'|'not_supported'|'unknown_input'|'source_pending'|'out_of_scope';
export type AnalysisContext={
  version:typeof BOOK_ANALYSIS_VERSION;year:number;birthSex:'male'|'female'|null;
  birth:{solar:{y:number;m:number;d:number};time:BirthInput['time']|null;timezone:string|null;place:string;provenance:'explicit-input'|'partial-input'};
  engine:Chart['meta'];queryCatalogue:'p1b';age:number;ageContext:'young'|'youth'|'adult';
  tables:ReturnType<typeof natalTableCoverage>;language:'shared-zh';international:'original-snapshot';layers:{natal:'available';decade:'legacy-adapter';annual:'legacy-adapter'};
};
export type AnalysisFact={id:string;layer:'natal';native:true;position:NatalStarLookup};
export type BorrowReference={id:string;target:{palace:string;branch:string};origin:{palace:string;branch:string}|null;
  majorFactIds:string[];status:'supported'|'unknown_input';scope:'opposite-reference-only';movedNativeStars:false;reason?:string};
export type RuleDecision={
  id:string;ruleId:string;adapter:string;chapters:string[];layer:'natal'|'decade'|'annual';timeLayers:('natal'|'decade'|'annual')[];
  queryCatalogue:'p0'|'p1b'|'legacy';kind:'condition'|'profile-selection'|'legacy-selection';status:DecisionStatus;
  presentation:'selected'|'valid_not_written'|'not_selected';presentationReason:string;
  factIds:string[];relationIds:string[];sourceIds:string[];conditions:string[];exceptions:string[];
  requirements:unknown;checks:unknown;qualifiers:string[];coverage:'executable'|'selection-only'|'unmapped';
};
export type Focus={id:string;question:string;factIds:string[];decisionIds:string[];qualifiers:string[];relationIds:string[]};
export type ChapterDecision={chapter:string;subjectRole:string;layer:'natal'|'decade'|'annual';timeLayers:('natal'|'decade'|'annual')[];focus:Focus[];
  unresolvedDecisionIds:string[];validButUnwrittenDecisionIds:string[]};
export type ClaimLink={id:string;segment:number;statement:number|null;role:'fact'|'book-interpretation'|'editorial';
  sourceIds:string[];citationIds:string[];references:{citationId:string;role:'direct'|'support'|'required'|'exception'|'comparison'|'method'|'legacy-unclassified';blockIds:string[]}[];focusIds:string[];decisionIds:string[];review:'decision-linked'|'legacy-unmapped'|'editorial'};
export type ChapterAnalysis={version:typeof BOOK_ANALYSIS_VERSION;context:AnalysisContext;facts:AnalysisFact[];relations:BorrowReference[];
  decisions:RuleDecision[];chapter:ChapterDecision;claims:ClaimLink[];upstreamFocusIds:string[]};
export type PalaceReview={palace:string;profile:{id:string;sources:string[];conditions:string[]};borrowed:boolean;
  rules:{rule:{id:string;when:PalacePredicate;sources:string[];conditions:string[]};evaluated?:PalaceEvaluation;selected:boolean}[];namespace:string;retainedReader?:string};
export type AnalysisRecorder={palace(review:PalaceReview):void};
export const nativeFactId=(p:NatalStarLookup)=>`fact:natal:${p.star}:${p.status==='available'?p.branch:'unknown'}`;
export const decisionStatus=(status:'matched'|'unmatched'|'not_applicable'):DecisionStatus=>status==='matched'?'supported':status==='unmatched'?'not_supported':'unknown_input';

/** Validate stored edges, not the astrology. Reading never reruns a rule or fills missing metadata. */
export function isChapterAnalysis(value:unknown):value is ChapterAnalysis{
 try{return checkChapterAnalysis(value);}catch{return false;}
}
function checkChapterAnalysis(value:unknown):value is ChapterAnalysis{
  if(!value||typeof value!=='object')return false;
  const r=value as ChapterAnalysis;
  const strings=(a:unknown):a is string[]=>Array.isArray(a)&&a.every(s=>typeof s==='string');
  if(r.version!==BOOK_ANALYSIS_VERSION||r.context?.version!==BOOK_ANALYSIS_VERSION||!Number.isInteger(r.context.year)
    ||!['male','female',null].includes(r.context.birthSex)||!r.chapter||typeof r.chapter.chapter!=='string')return false;
  const c=r.context,b=c.birth,e=c.engine;
  if(!Number.isInteger(c.age)||!['young','youth','adult'].includes(c.ageContext)||c.queryCatalogue!=='p1b'||c.language!=='shared-zh'||c.international!=='original-snapshot'
    ||!b||!b.solar||![b.solar.y,b.solar.m,b.solar.d].every(Number.isInteger)||typeof b.place!=='string'||!(b.timezone===null||typeof b.timezone==='string')
    ||!['explicit-input','partial-input'].includes(b.provenance)||!e||typeof e.engineVersion!=='string'||typeof e.schoolProfile!=='string'||typeof e.tablesChecksum!=='string'
    ||!e.rules||!c.tables||c.layers?.natal!=='available'||c.layers.decade!=='legacy-adapter'||c.layers.annual!=='legacy-adapter')return false;
  if(!['natal','decade','annual'].includes(r.chapter.layer)||typeof r.chapter.subjectRole!=='string'||!strings(r.upstreamFocusIds)
    ||r.upstreamFocusIds.some(id=>!/^focus:(命宮|官祿|財帛|福德):selected$/.test(id)))return false;
  if(![r.facts,r.relations,r.decisions,r.claims,r.chapter.focus,r.chapter.unresolvedDecisionIds,r.chapter.validButUnwrittenDecisionIds,r.upstreamFocusIds].every(Array.isArray))return false;
  const ids=(a:{id:string}[])=>a.every(v=>v&&typeof v.id==='string')&&new Set(a.map(v=>v.id)).size===a.length;
  if(new Set(r.facts.map(f=>f.position?.star)).size!==r.facts.length)return false;
  if(!ids(r.facts)||!ids(r.relations)||!ids(r.decisions)||!ids(r.claims)||!ids(r.chapter.focus))return false;
  const facts=new Set(r.facts.map(f=>f.id)),relations=new Set(r.relations.map(v=>v.id)),decisions=new Set(r.decisions.map(d=>d.id));
  const focuses=new Set([...r.chapter.focus.map(f=>f.id),...r.upstreamFocusIds]);
  if(!r.facts.every(f=>f.native===true&&f.layer==='natal'&&f.position&&f.id===nativeFactId(f.position)
    &&(f.position.status==='unknown'&&typeof f.position.code==='string'&&typeof f.position.reason==='string'||f.position.status==='available'&&BRANCHES.includes(f.position.branch)&&typeof f.position.palace==='string'&&f.position.placement?.name===f.position.star&&typeof f.position.source?.queryVersion==='string')))return false;
  if(!r.relations.every(b=>b.movedNativeStars===false&&b.scope==='opposite-reference-only'&&['supported','unknown_input'].includes(b.status)
    &&b.target&&typeof b.target.palace==='string'&&BRANCHES.includes(b.target.branch as never)&&strings(b.majorFactIds)&&b.majorFactIds.every(id=>facts.has(id))
    &&(b.status!=='supported'||b.origin&&b.majorFactIds.length>0&&BRANCHES[(BRANCHES.indexOf(b.target.branch as never)+6)%12]===b.origin.branch
      &&b.majorFactIds.every(id=>{const p=r.facts.find(f=>f.id===id)!.position;return p.status==='available'&&p.palace===b.origin!.palace&&p.branch===b.origin!.branch;}))))return false;
  if(!r.decisions.every(d=>typeof d.ruleId==='string'&&typeof d.adapter==='string'&&strings(d.chapters)&&['natal','decade','annual'].includes(d.layer)
    &&['p0','p1b','legacy'].includes(d.queryCatalogue)&&['condition','profile-selection','legacy-selection'].includes(d.kind)
    &&['executable','selection-only','unmapped'].includes(d.coverage)&&typeof d.presentationReason==='string'
    &&['supported','not_supported','unknown_input','source_pending','out_of_scope'].includes(d.status)
    &&['selected','valid_not_written','not_selected'].includes(d.presentation)
    &&(d.presentation!=='valid_not_written'||d.status==='supported')
    &&strings(d.factIds)&&d.factIds.every(id=>facts.has(id))&&strings(d.relationIds)&&d.relationIds.every(id=>relations.has(id))
    &&strings(d.sourceIds)&&strings(d.conditions)&&strings(d.exceptions)&&strings(d.qualifiers)))return false;
  const layers=(a:unknown)=>strings(a)&&a.length>0&&a.every(l=>['natal','decade','annual'].includes(l));
  if(!layers(r.chapter.timeLayers)||!r.decisions.every(d=>layers(d.timeLayers)))return false;
  if(!r.chapter.focus.every(f=>typeof f.question==='string'&&strings(f.factIds)&&f.factIds.every(id=>facts.has(id))&&strings(f.decisionIds)&&f.decisionIds.every(id=>decisions.has(id))
    &&strings(f.relationIds)&&f.relationIds.every(id=>relations.has(id))&&strings(f.qualifiers)))return false;
  if(!r.claims.every(c=>(c.statement===null||Number.isInteger(c.statement)&&c.statement>=0)&&['fact','book-interpretation','editorial'].includes(c.role)
    &&['decision-linked','legacy-unmapped','editorial'].includes(c.review)&&Number.isInteger(c.segment)&&c.segment>=0&&strings(c.focusIds)&&c.focusIds.length>0&&c.focusIds.every(id=>focuses.has(id))
    &&Array.isArray(c.references)&&c.references.every(ref=>ref&&c.citationIds.includes(ref.citationId)&&['direct','support','required','exception','comparison','method','legacy-unclassified'].includes(ref.role)&&strings(ref.blockIds))
    &&strings(c.decisionIds)&&c.decisionIds.every(id=>decisions.has(id))&&strings(c.citationIds)&&strings(c.sourceIds)))return false;
  if(!strings(r.chapter.unresolvedDecisionIds)||!strings(r.chapter.validButUnwrittenDecisionIds))return false;
  return r.chapter.unresolvedDecisionIds.every(id=>decisions.has(id)&&['unknown_input','source_pending'].includes(r.decisions.find(d=>d.id===id)!.status))
    &&r.chapter.validButUnwrittenDecisionIds.every(id=>decisions.has(id)&&r.decisions.find(d=>d.id===id)!.presentation==='valid_not_written');
}
