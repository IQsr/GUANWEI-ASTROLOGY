import audit from '../src/cards/engine-p1b-review.json';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {cast,lookupNatalStar,type Chart,type BirthInput} from '@guanwei/ziwei';
import {analyzeNextBatch,P1B_RULES} from '../src/engine-p1b';
import {analyzeFirstBatch} from '../src/engine-p1a';
import {evaluate,type Condition} from '../src/condition';
import {ConditionSchema} from '../src/rule';
import data from '../src/cards/engine-p1b-rules.json';
import deep from '../../../tools/wang-reference/deep-index.json';
import initial from '../../../tools/wang-reference/initial-index.json';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
import p1aReview from '../src/cards/engine-p1a-review.json';
const rows=Object.fromEntries(fixtures.filter((f)=>['TL','A','C'].includes(f.id)).map((f)=>{const c=cast(f.input as BirthInput);if(!c.ok)throw Error(c.message);return[f.id,{chart:c.value,sex:f.input.sex as 'male'|'female'}];}));
const report=(id:string)=>analyzeNextBatch(rows[id]!.chart,{birthSex:rows[id]!.sex});
const result=(id:string,rule:string)=>report(id).results.find((r)=>r.id===rule)!;

it('12 new cards preserve source blocks, explicit prerequisites and exceptions; 30 rules compose through the shared evaluator',()=>{
  expect(P1B_RULES).toHaveLength(12);expect(new Set(P1B_RULES.map((r)=>r.id)).size).toBe(12);expect(data.pdf_sha256).toBe(deep.book.sha256);
  const blocks=new Map(deep.blocks.map((b)=>[b.id,b]));
  for(const [id,source] of Object.entries(data.sources))expect(blocks.get(id),id).toMatchObject({pdf_page:source.page,text_sha256:source.sha256,section_title:source.section});
  for(const rule of P1B_RULES){expect(ConditionSchema.safeParse(rule.when).success,rule.id).toBe(true);expect(rule.conditions.length).toBeGreaterThan(0);expect(rule.exceptions.length).toBeGreaterThan(0);for(const id of rule.sources)expect(id in data.sources).toBe(true);}
  for(const star of ['陰煞','天虛','天傷','天官','天福']){
    const p=lookupNatalStar(rows.C!.chart,star,{catalogue:'p1b',birthSex:'female'});if(p.status!=='available')throw Error(p.reason);
    for(const id of p.source.references)expect(initial.paragraph_index.some((p)=>p.id===id)).toBe(true);
    expect(p.source.sourceFingerprint).toBe(initial.chapters.find((c)=>c.number===7)!.source.html_sha256);
  }
});

it('同梁 adds both meeting modifiers while retaining the existing clamped 忌 and native positions',()=>{
  expect(result('TL','tongliang-yinsha').status).toBe('supported');expect(result('TL','tongliang-tianxu').status).toBe('supported');
  expect(result('TL','tongliang-clamped-ji').status).toBe('supported');
  expect(result('TL','tongliang-yinsha').bindings).toContainEqual(expect.objectContaining({star:'陰煞',palace:'官祿',branch:'子'}));
  expect(result('TL','tianxu-wealth').status).toBe('not_supported');
});

it('天府 keeps the new 天傷 modifier in native 僕役機梁, not the person in 命宮',()=>{
  const r=result('A','tianfu-friends-jiliang-modifiers');expect(r.checks.result.status).toBe('matched');expect(r.status).toBe('pending');
  expect(r.bindings).toContainEqual(expect.objectContaining({star:'天傷',palace:'僕役',branch:'辰'}));
  expect(r.conditions.join('')).toContain('主語是本章一般下屬');
  expect(result('A','tianfu-kongku').status).toBe('not_supported');expect(result('A','tianfu-ren-ke').status).toBe('pending');
  // 天福 in empty 疾厄午 does not meet native 天同 in 父母子 by moving the borrowed major.
  expect(result('A','tianfu-star-tiantong-same').status).toBe('not_supported');
});

it('機梁同度陰煞天虛 does not manufacture 尖刻; 天官與梁、天福與同 retain independent positive modifiers',()=>{
  for(const id of ['jiliang-sharp-yinsha','jiliang-sharp-tianxu']){const r=result('C',id);expect(r.checks.result.status).toBe('matched');expect(r.status).toBe('pending');expect(r.gates[0]!.gate).toMatchObject({id:'jiliang-sharp-nature'});}
  for(const id of ['jiliang-sharp-tianshang','jiliang-sharp-tianxing'])expect(result('C',id).status).toBe('not_supported');
  expect(result('C','jiliang-mingduan-talent').status).toBe('pending');
  expect(result('C','tianguan-tianliang-same').status).toBe('supported');expect(result('C','tianfu-star-tiantong-same').status).toBe('supported');
  expect(result('C','tianguan-tianliang-same').bindings).toContainEqual(expect.objectContaining({star:'天官',palace:'命宮',branch:'戌'}));
  expect(result('C','tianfu-star-tiantong-same').bindings).toContainEqual(expect.objectContaining({star:'天福',palace:'財帛',branch:'午'}));
});

it('missing sex and unimplemented stars survive negation, and context reuse cannot cache the wrong sex',()=>{
  const chart=rows.TL!.chart;const cond:Condition={not:{star:'天傷',in:{name:'命宮'}}};
  expect(evaluate(cond,{chart,natalQuery:{catalogue:'p1b'}}).status).toBe('not_applicable');
  expect(analyzeNextBatch(chart).facts.find((f)=>f.position.star==='天傷')!.position.status).toBe('unknown');
  expect(evaluate({not:{star:'天哭',in:{name:'命宮'}}},{chart,natalQuery:{catalogue:'p1b'}}).status).toBe('not_applicable');
  const ctx={chart,natalQuery:{catalogue:'p1b' as const,birthSex:'female' as 'male'|'female'}};
  expect(evaluate({star:'天傷',in:{name:'疾厄'}},ctx).status).toBe('matched');ctx.natalQuery.birthSex='male';
  expect(evaluate({star:'天傷',in:{name:'疾厄'}},ctx).status).toBe('unmatched');
});

it('same-palace rules reject mere meeting and borrowed majors, and excluded modifiers do not prove 明斷',()=>{
  // Isolated hypothetical geometry checks, not complete charts for new real birth samples.
  const chart=structuredClone(rows.C!.chart);chart.ganzhi.year[0]='丁';
  // 丁年天官寅 still meets 命戌, but does not share 天梁's native palace.
  const r=analyzeNextBatch(chart,{birthSex:'female'});expect(r.results.find((r)=>r.id==='tianguan-tianliang-same')!.status).toBe('not_supported');
  expect(r.results.find((r)=>r.id==='jiliang-mingduan-talent')!.status).toBe('pending');
  const changed=structuredClone(rows.C!.chart);changed.lunar.m=4;changed.lunar.isLeapMonth=false;changed.ganzhi.year[1]='子';
  const without=analyzeNextBatch(changed,{birthSex:'female'});
  for(const id of ['jiliang-sharp-yinsha','jiliang-sharp-tianxu'])expect(without.results.find((r)=>r.id===id)!.status).toBe('not_supported');
  expect(without.results.find((r)=>r.id==='jiliang-mingduan-talent')!.status).toBe('pending');
});

it('P1a reports remain byte-identical; P1b facts deduplicate, all sources resolve and callers remain unmodified',()=>{
  for(const [id,{chart,sex}] of Object.entries(rows)){
    const before=JSON.stringify(chart),r=analyzeNextBatch(chart,{birthSex:sex});
    expect(r.facts).toHaveLength(49);expect(new Set(r.facts.map((f)=>f.id)).size).toBe(49);
    const facts=new Set(r.facts.map((f)=>f.id));for(const item of r.results){for(const fact of item.factIds)expect(facts.has(fact),fact).toBe(true);for(const source of item.sourceIds)expect(r.sources[source as keyof typeof r.sources]).toBeDefined();}
    expect(r.structuralLinks.every((l)=>l.movedNativeStars===false)).toBe(true);
    expect(JSON.stringify(chart)).toBe(before);
    expect(createHash('sha256').update(JSON.stringify(analyzeFirstBatch(chart))).digest('hex'),id).toBe(p1aReview.samples.find((s)=>s.id===id)!.report_sha256);
  }
});

it('P1b reviewed code, source choices and all three complete reports remain bound and reproducible',()=>{
  for(const [path,expected] of Object.entries(audit.parents)){
    const text=readFileSync(new URL(`../../../${path}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    expect(createHash('sha256').update(text).digest('hex'),path).toBe(expected);
  }
  for(const sample of audit.samples){
    const r=report(sample.id);
    expect(createHash('sha256').update(JSON.stringify(r)).digest('hex'),sample.id).toBe(sample.report_sha256);
    expect(r.results.map((r)=>({id:r.id,status:r.status,sourceIds:r.sourceIds}))).toEqual(sample.results);
    expect(r.facts.filter((f)=>f.position.status==='available'&&f.position.source.method==='minor-p1b-v1').map((f)=>{
      if(f.position.status!=='available')throw Error('Expected available');return {star:f.position.star,branch:f.position.branch,palace:f.position.palace};
    })).toEqual(sample.new_positions);
  }
});
