import { lookupNatalStar, natalStarCoverage, P1A_QUERY_VERSION, P1A_STAR_VERSION, sanFangPalaces,
  type Chart } from '@guanwei/ziwei';
import { P1A_CONDITION_VERSION } from './condition';
import data from './cards/engine-p1a-rules.json';

export const P1A_ANALYSIS_VERSION = 'engine-p1a-analysis-v1';
export type {PilotFamily,P1aRule,P1aTrace,P1aRuleResult} from './pilot-analysis';
import {evaluatePilotRules,pilotFactId,type PilotFamily,type P1aRule} from './pilot-analysis';
export const P1A_RULES = data.rules as unknown as readonly P1aRule[];
export const P1A_SOURCES = data.sources;
const query = { catalogue: 'p1a' } as const;

export function pilotFamily(chart: Chart): PilotFamily | null {
  const p = chart.palaces.find((p) => p.name === '命宮');
  if (!p || p.borrowsFrom) return null;
  const key = p.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort().join('+');
  if (key === ['天同','天梁'].sort().join('+') && ['寅','申'].includes(p.branch)) return 'tongliang';
  if (key === '天府' && ['巳','亥'].includes(p.branch)) return 'tianfu';
  if (key === ['天機','天梁'].sort().join('+') && ['辰','戌'].includes(p.branch)) return 'jiliang';
  return null;
}

/** Deliberately separate from production registries and writers. No two-result cap or good/bad vote. */
export function analyzeFirstBatch(chart: Chart) {
  const family = pilotFamily(chart);
  const positions = natalStarCoverage(chart,undefined,query);
  const facts = positions.map((p)=>({id:pilotFactId(p,P1A_QUERY_VERSION),native:true as const,position:p}));
  const results=family?evaluatePilotRules(chart,P1A_RULES.filter((r)=>r.groups.includes(family)),query,P1A_QUERY_VERSION):[];
  const ming=chart.palaces.find((p)=>p.name==='命宮');
  const structuralLinks=ming?sanFangPalaces(chart.palaces,ming.branch).filter((p)=>p.borrowsFrom).map((target)=>{
    const origin=chart.palaces.find((p)=>p.branch===target.borrowsFrom);
    return {target:{palace:target.name,branch:target.branch},origin:origin?{palace:origin.name,branch:origin.branch}:null,
      kind:'borrowed-major-structure' as const,majors:origin?.stars.filter((s)=>s.kind==='major').map((s)=>({star:s.name,hua:s.sihua??null}))??[],
      sourceIds:family==='tianfu'?['wtz.deep.p201.b001']:family==='jiliang'?['wtz.deep.p215.b010']:['wtz.deep.p087.b010'],
      movedNativeStars:false as const};
  }):[];
  const sourceIds=[...new Set(results.flatMap((r)=>r.sourceIds))];
  return {version:P1A_ANALYSIS_VERSION,queryVersion:P1A_QUERY_VERSION,placementVersion:P1A_STAR_VERSION,conditionVersion:P1A_CONDITION_VERSION,
    engineVersion:chart.meta.engineVersion,schoolProfile:chart.meta.schoolProfile,layer:'natal' as const,activation:'experimental-only' as const,
    family,facts,results,structuralLinks,sources:Object.fromEntries(sourceIds.map((id)=>[id,P1A_SOURCES[id as keyof typeof P1A_SOURCES]])),
    limits:[...data.scope_notes],deduplication:'stable native fact IDs; references do not count as extra votes' as const};
}
