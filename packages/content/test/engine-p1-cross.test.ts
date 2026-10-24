import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {cast,MAJOR_STARS,type BirthInput,type Chart} from '@guanwei/ziwei';
import {analyzeCrossPalaces,P1_CROSS_RULES,CROSS_PALACES} from '../src/engine-p1-cross';
import {analyzeFirstBatch} from '../src/engine-p1a';
import {ConditionSchema} from '../src/rule';
import data from '../src/cards/engine-p1-cross-rules.json';
import audit from '../src/cards/engine-p1-cross-review.json';
import p1a from '../src/cards/engine-p1a-review.json';
import p1b from '../src/cards/engine-p1b-review.json';
import deep from '../../../tools/wang-reference/deep-index.json';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
import previews from '../../../apps/web/src/lib/free-ming-preview.json';
const hash=(r:unknown)=>createHash('sha256').update(JSON.stringify(r)).digest('hex');
const samples=Object.fromEntries(fixtures.filter((f)=>['TL','A','C'].includes(f.id)).map((f)=>{const r=cast(f.input as BirthInput);if(!r.ok)throw Error(r.message);return[f.id,{chart:r.value,sex:f.input.sex as 'male'|'female'}];}));
const report=(id:string,chart:Chart=samples[id]!.chart)=>analyzeCrossPalaces(chart,{birthSex:samples[id]!.sex});
const item=(id:string,rule:string)=>report(id).results.find((r)=>r.id===rule)!;

it('25 manually reviewed cards and 7 synthesis threads retain resolvable original section bindings and explicit limits',()=>{
  expect(P1_CROSS_RULES).toHaveLength(25);expect(data.threads).toHaveLength(7);expect(new Set(P1_CROSS_RULES.map((r)=>r.id)).size).toBe(25);
  expect(data.pdf_sha256).toBe(deep.book.sha256);
  const blocks=new Map(deep.blocks.map((b)=>[b.id,b]));
  for(const [id,s] of Object.entries(data.sources))expect(blocks.get(id),id).toMatchObject({pdf_page:s.page,section_title:s.section,text_sha256:s.sha256});
  for(const r of P1_CROSS_RULES){expect(ConditionSchema.safeParse(r.when).success,r.id).toBe(true);expect(r.conditions.length).toBeGreaterThan(0);expect(r.exceptions.length).toBeGreaterThan(0);for(const id of r.sources)expect(id in data.sources,id).toBe(true);}
  for(const t of data.threads){expect(t.requires.length).toBeGreaterThan(1);for(const id of t.requires)expect(P1_CROSS_RULES.some((r)=>r.id===id&&r.groups.includes(t.family as never)),id).toBe(true);for(const id of t.sources)expect(id in data.sources).toBe(true);expect(t.exceptions.length).toBeGreaterThan(0);}
});

it('同梁 connects work changes with the actual 同忌 meeting wealth, without inventing a specialised design or quiet-rest branch',()=>{
  for(const id of ['tl-four-frame','tl-work-changing','tl-wealth-planning','tl-wealth-tongji','tl-wealth-yanglu','tl-rest-active'])expect(item('TL',id).status,id).toBe('supported');
  expect(item('TL','tl-wealth-tongji').bindings).toContainEqual(expect.objectContaining({star:'天同',palace:'命宮',branch:'申',hua:'忌'}));
  expect(item('TL','tl-design-same-palace').status).toBe('not_supported');expect(item('TL','tl-rest-day-branch').status).toBe('pending');
  expect(report('TL').threads.every((t)=>t.status==='supported'&&t.reading!==null)).toBe(true);
});

it('天府 accepts the actual 府科 plus 有祿 technical clue, but excludes a 紫微權 that does not meet 官祿',()=>{
  for(const id of ['tf-store','tf-career-role','tf-career-ke','tf-wealth-reference','tf-rest-wuji','tf-rest-wutan'])expect(item('A',id).status,id).toBe('supported');
  expect(item('A','tf-career-authority').status).toBe('not_supported');expect(item('A','tf-ren-ke-balance').status).toBe('pending');
  const thread=report('A').threads.find((t)=>t.id==='tf-role-resources')!;expect(thread.status).toBe('not_supported');expect(thread.reading).toBeNull();
});

it('one native 武曲忌 remains in 福德 even when 財帛 borrows the same star system',()=>{
  const r=report('A'),f=r.frames.find((f)=>f.palace==='財帛')!,rest=r.frames.find((f)=>f.palace==='福德')!;
  expect(f.nativeMajors).toEqual([]);expect(f.reference!.origin).toEqual({palace:'福德',branch:'丑'});
  const wu=f.reference!.majors.find((m)=>m.star==='武曲')!;expect(wu).toMatchObject({hua:'忌'});expect(rest.nativeMajors).toContainEqual(wu);
  expect(r.facts.filter((f)=>f.position.star==='武曲')).toHaveLength(1);
  const t=r.threads.find((t)=>t.id==='tf-money-satisfaction')!;expect(t.factIds.filter((id)=>id===wu.factId)).toHaveLength(1);
  expect(f.factIds).not.toContain(wu.factId);expect(f.reference!.movedNativeStars).toBe(false);
});

it('機梁 records both empty palaces, keeps source companions native, and rejects remote-wealth and 吉化 shortcuts',()=>{
  const r=report('C'),career=r.frames.find((f)=>f.palace==='官祿')!,rest=r.frames.find((f)=>f.palace==='福德')!;
  expect(career.reference!.origin).toEqual({palace:'夫妻',branch:'申'});expect(rest.reference!.origin).toEqual({palace:'財帛',branch:'午'});
  for(const star of ['右弼','火星']){
    const fact=r.facts.find((f)=>f.position.star===star)!;expect(career.reference!.originCompanionFactIds).toContain(fact.id);expect(career.factIds).not.toContain(fact.id);
  }
  for(const star of ['左輔','天福']){const fact=r.facts.find((f)=>f.position.star===star)!;expect(rest.reference!.originCompanionFactIds).toContain(fact.id);expect(rest.factIds).not.toContain(fact.id);}
  expect(item('C','jl-wealth-distant').status).toBe('not_supported');expect(item('C','jl-career-yanglu').status).toBe('not_supported');
  expect(item('C','jl-rest-labor').status).toBe('supported');expect(item('C','jl-rest-art').status).toBe('supported');
  for(const id of ['jiliang-sharp-yinsha','jiliang-sharp-tianxu','jiliang-mingduan-talent'])expect(r.priorAnalysis.results.find((r)=>r.id===id)!.status).toBe('pending');
});

it('missing or invalid borrowing stays pending and withholds synthesis; it never becomes a known absence',()=>{
  for(const mode of ['missing','wrong-opposite','recursive'] as const){
    const c=structuredClone(samples.C!.chart),target=c.palaces.find((p)=>p.name==='官祿')!;
    if(mode==='missing')delete target.borrowsFrom;
    if(mode==='wrong-opposite')target.borrowsFrom='卯';
    if(mode==='recursive')c.palaces.find((p)=>p.name==='夫妻')!.borrowsFrom='寅';
    const r=report('C',c);expect(r.results.find((r)=>r.id==='jl-career-reference')!.status,mode).toBe('pending');
    expect(r.threads.find((t)=>t.id==='jl-work-value')!.reading,mode).toBeNull();
  }
  const c=structuredClone(samples.C!.chart);delete c.palaces.find((p)=>p.name==='福德')!.borrowsFrom;
  expect(report('C',c).results.find((r)=>r.id==='jl-rest-opposite')!.status).toBe('pending');
});

it('incomplete majors or duplicate palace geometry prevent fabricated empty-palace certainty',()=>{
  const c=structuredClone(samples.C!.chart);for(const p of c.palaces)p.stars=p.stars.filter((s)=>s.name!=='太陽');
  const r=report('C',c);expect(r.frames.every((f)=>f.nativeCheck.status==='not_applicable')).toBe(true);
  expect(r.results.find((r)=>r.id==='jl-career-reference')!.status).toBe('pending');expect(r.threads.find((t)=>t.id==='jl-work-value')!.reading).toBeNull();
  const duplicate=structuredClone(samples.TL!.chart);duplicate.palaces[1]!.branch=duplicate.palaces[0]!.branch;
  const d=report('TL',duplicate);expect(d.integrity.status).toBe('not_applicable');expect(d.results.every((r)=>r.status==='pending')).toBe(true);expect(d.threads.every((t)=>t.reading===null)).toBe(true);
  const swapped=structuredClone(samples.TL!.chart),one=swapped.palaces.find((p)=>p.name==='父母')!,two=swapped.palaces.find((p)=>p.name==='兄弟')!;
  [one.name,two.name]=[two.name,one.name];expect(report('TL',swapped).integrity.status).toBe('not_applicable');
});

it('all 72 existing chart fixtures use the same opt-in contract without mutation or unresolved facts/sources',()=>{
  for(const fixture of previews){const c=cast(fixture.input as BirthInput);if(!c.ok)throw Error(c.message);const before=JSON.stringify(c.value);
    const r=analyzeCrossPalaces(c.value,{birthSex:fixture.input.sex as 'male'|'female'});
    expect(JSON.stringify(c.value)).toBe(before);expect(r.facts).toHaveLength(49);expect(r.frames.map((f)=>f.palace)).toEqual(CROSS_PALACES);
    expect(r.frames.every((f)=>f.nativeCheck.status==='matched')).toBe(true);
    const facts=new Set(r.facts.map((f)=>f.id));expect(facts.size).toBe(49);
    for(const x of [...r.results,...r.threads]){expect(new Set(x.factIds).size).toBe(x.factIds.length);for(const id of x.factIds)expect(facts.has(id),id).toBe(true);for(const id of x.sourceIds)expect(r.sources[id as keyof typeof r.sources],id).toBeDefined();}
    for(const frame of r.frames)if(frame.reference){expect(frame.reference.check.status).toBe('matched');expect(frame.reference.movedNativeStars).toBe(false);}
    if(!r.family){expect(r.results).toEqual([]);expect(r.threads).toEqual([]);}
    for(const f of r.facts)if(f.position.status==='available'&&MAJOR_STARS.includes(f.position.star as never))expect(f.native).toBe(true);
  }
},20000);

it('P1a and P1b complete reports remain byte-identical, including unknown sex and unimplemented coverage',()=>{
  for(const [id,{chart}] of Object.entries(samples)){
    const r=report(id);expect(hash(r.priorAnalysis),id).toBe(p1b.samples.find((s)=>s.id===id)!.report_sha256);
    expect(hash(analyzeFirstBatch(chart)),id).toBe(p1a.samples.find((s)=>s.id===id)!.report_sha256);
  }
  const r=analyzeCrossPalaces(samples.C!.chart);expect(r.facts.find((f)=>f.position.star==='天傷')!.position.status).toBe('unknown');
  expect(r.priorAnalysis.limits.join('')).toContain('天哭');
});

it('review binds implementation, source choices, and the complete three sample reports',()=>{
  for(const [path,sha] of Object.entries(audit.parents)){const text=readFileSync(new URL(`../../../${path}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');expect(createHash('sha256').update(text).digest('hex'),path).toBe(sha);}
  for(const sample of audit.samples){const r=report(sample.id);expect(hash(r),sample.id).toBe(sample.report_sha256);expect(r.results.map((r)=>({id:r.id,status:r.status}))).toEqual(sample.results);expect(r.threads.map((r)=>({id:r.id,status:r.status}))).toEqual(sample.threads);}
  const index=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');expect(index).not.toContain('engine-p1-cross');
});
