import {natalStarCoverage,P1B_QUERY_VERSION,P1B_STAR_VERSION,type Chart,type NatalQueryOptions} from '@guanwei/ziwei';
import {P1A_RULES,P1A_SOURCES,pilotFamily,analyzeFirstBatch} from './engine-p1a';
import {P1B_CONDITION_VERSION} from './condition';
import {evaluatePilotRules,pilotFactId,type P1aRule} from './pilot-analysis';
import data from './cards/engine-p1b-rules.json';

export const P1B_ANALYSIS_VERSION='engine-p1b-analysis-v1';
export const P1B_RULES=data.rules as unknown as readonly P1aRule[];
export const P1B_SOURCES={...P1A_SOURCES,...data.sources};
const priorOverrides=data.prior_rule_overrides as Record<string,{exceptions:string[]}>;

/** Cumulative pilot, explicitly enabled. Existing writer and P1a snapshots remain separate. */
export function analyzeNextBatch(chart:Chart,options:{birthSex?:'male'|'female'}={}){
  const query:NatalQueryOptions={catalogue:'p1b',...options};
  const family=pilotFamily(chart);
  const rules=[...P1A_RULES.map((r)=>({...r,...priorOverrides[r.id]})),...P1B_RULES];
  const results=family?evaluatePilotRules(chart,rules.filter((r)=>r.groups.includes(family)),query,P1B_QUERY_VERSION):[];
  const facts=natalStarCoverage(chart,undefined,query).map((p)=>({id:pilotFactId(p,P1B_QUERY_VERSION),native:true as const,position:p}));
  const structuralLinks=analyzeFirstBatch(chart).structuralLinks;
  const sourceIds=[...new Set([...results.flatMap((r)=>r.sourceIds),...structuralLinks.flatMap((r)=>r.sourceIds)])];
  return {version:P1B_ANALYSIS_VERSION,queryVersion:P1B_QUERY_VERSION,placementVersion:P1B_STAR_VERSION,conditionVersion:P1B_CONDITION_VERSION,
    engineVersion:chart.meta.engineVersion,schoolProfile:chart.meta.schoolProfile,layer:'natal' as const,activation:'experimental-only' as const,
    family,inputs:{birthSex:options.birthSex??null},facts,results,structuralLinks,
    sources:Object.fromEntries(sourceIds.map((id)=>[id,P1B_SOURCES[id as keyof typeof P1B_SOURCES]])),
    limits:[...data.scope_notes],deduplication:'stable native fact IDs; references do not count as extra votes' as const};
}
