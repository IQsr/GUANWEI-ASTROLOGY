import previews from '../../../apps/web/src/lib/free-ming-preview.json';
import { expect, it } from 'vitest';
import { cast, BRANCHES, P1A_STARS, P1A_QUERY_VERSION, lookupNatalStar, queryNatalStar, natalStarCoverage, type BirthInput, type Chart } from '../src/index';
import wenmo from './fixtures/wenmo-charts.json';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
const options = { catalogue: 'p1a' } as const;
const charts = fixtures.filter((f) => ['TL','A','C'].includes(f.id)).map((f) => {
  const r=cast(f.input as BirthInput);if(!r.ok)throw Error(r.message);return {id:f.id,chart:r.value};
});
const expected = {
  TL:['未','寅','戌','戌','辰','巳','酉','寅','戌','丑','酉'],
  A:['酉','未','辰','子','寅','寅','子','寅','辰','辰','子'],
  C:['巳','寅','辰','申','午','亥','卯','申','寅','子','申'],
};

it('P1a is explicit opt-in, provides all 44 positions and leaves the chart/cast contract unchanged',()=>{
  for(const {id,chart} of charts){
    const frozen=JSON.stringify(chart);
    expect(natalStarCoverage(chart)).toHaveLength(33);
    expect(lookupNatalStar(chart,'天才')).toMatchObject({status:'unknown',code:'not-enabled'});
    const extended=natalStarCoverage(chart,undefined,options);
    expect(extended).toHaveLength(44);expect(extended.every((r)=>r.status==='available')).toBe(true);
    P1A_STARS.forEach((star,i)=>{
      const found=lookupNatalStar(chart,star,options);
      expect(found).toMatchObject({status:'available',branch:expected[id as keyof typeof expected][i],source:{queryVersion:P1A_QUERY_VERSION,method:'minor-p1a-v1',verification:'transcription-not-original-collated'}});
    });
    expect(chart.meta.engineVersion).toBe('0.4.0');
    expect(chart.palaces.flatMap((p)=>p.stars)).toHaveLength(28);
    expect(JSON.stringify(chart)).toBe(frozen);
  }
});

// Use the witness's documented D-002 timezone and D-006 late-Zi convention only for this comparison.
it('all 231 independent Wenmo star positions agree, including leap-month examples',()=>{
  let checks=0;
  const witnessName=(star:string)=>star==='三台'?'三臺':star==='台輔'?'臺輔':star;
  for(const fixture of wenmo){
    const r=cast({solar:{y:fixture.birth.y,m:fixture.birth.m,d:fixture.birth.d},time:{h:fixture.birth.h,min:fixture.birth.min},tz:'Etc/GMT-8',place:{lng:120,lat:30,label:'x'},sex:fixture.yinyang.endsWith('男')?'male':'female',...(fixture.birth.h===23?{options:{lateZiHour:'next-day' as const}}:{})});
    if(!r.ok)throw Error(fixture.file);
    for(const star of P1A_STARS){
      const branch=Object.entries(fixture.palaces).find(([,p])=>p.stars.some(([s])=>s===witnessName(star)))?.[0];
      expect(branch,`${fixture.file}/${star} witness`).toBeDefined();
      expect(lookupNatalStar(r.value,star,options),`${fixture.file}/${star}`).toMatchObject({status:'available',branch});checks++;
    }
  }
  expect(checks).toBe(231);
});

it('all scope forms share the same native placement; helpers never move with borrowed majors',()=>{
  for(const {chart} of charts)for(const star of P1A_STARS){
    const located=lookupNatalStar(chart,star,options);if(located.status!=='available')throw Error(located.reason);
    for(const p of chart.palaces)for(const reach of ['same','sanfang','jia'] as const){
      const d=(BRANCHES.indexOf(located.branch)-BRANCHES.indexOf(p.branch)+12)%12;
      const status=(reach==='same'?[0]:reach==='sanfang'?[0,4,6,8]:[1,11]).includes(d)?'present':'absent';
      expect(queryNatalStar(chart,star,{palace:p.name,reach},options).status).toBe(status);
      expect(queryNatalStar(chart,star,{branch:p.branch,reach},options).status).toBe(status);
    }
  }
  const c=charts.find((r)=>r.id==='C')!.chart;
  expect(queryNatalStar(c,'天才',{palace:'官祿'},options).status).toBe('present');
  expect(queryNatalStar(c,'天才',{palace:'夫妻'},options).status).toBe('absent');
  expect(queryNatalStar(c,'天空',{palace:'命宮'},options).status).toBe('absent');
});

it('each star checks only its actual required inputs',()=>{
  const chart=structuredClone(charts[0]!.chart);
  chart.lunar.d=0;chart.lunar.m=0;
  for(const star of ['天空','華蓋','龍池','鳳閣','天才','台輔','封誥'])expect(lookupNatalStar(chart,star,options).status,star).toBe('available');
  for(const star of ['三台','八座','恩光','天貴'])expect(lookupNatalStar(chart,star,options)).toMatchObject({status:'unknown',code:'missing-input'});
  delete (chart as Partial<Chart>).ganzhi;
  expect(lookupNatalStar(chart,'天空',options)).toMatchObject({status:'unknown',code:'missing-input'});
  expect(lookupNatalStar(chart,'台輔',options).status).toBe('available');
});

it('anchor conflicts, unsupported chart versions and unimplemented second-batch stars remain unknown',()=>{
  const chart=structuredClone(charts[0]!.chart);
  chart.palaces[0]!.stars.push({name:'文曲',kind:'aux'});
  for(const star of ['台輔','封誥','天貴'])expect(lookupNatalStar(chart,star,options)).toMatchObject({status:'unknown',code:'conflicting-data'});
  chart.meta.engineVersion='0.3.0';
  expect(lookupNatalStar(chart,'天才',options)).toMatchObject({status:'unknown',code:'unsupported-version'});
  expect(lookupNatalStar(chart,'天哭',options)).toMatchObject({status:'unknown',code:'not-implemented'});
});

it('birthday counting includes day one and then the stated one-palace retreat',()=>{
  const chart=structuredClone(charts[0]!.chart);chart.lunar.d=1;
  expect(lookupNatalStar(chart,'三台',options)).toMatchObject({status:'available',branch:'巳'});
  expect(lookupNatalStar(chart,'八座',options)).toMatchObject({status:'available',branch:'酉'});
  expect(lookupNatalStar(chart,'恩光',options)).toMatchObject({status:'available',branch:'寅'});
  expect(lookupNatalStar(chart,'天貴',options)).toMatchObject({status:'available',branch:'戌'});
  chart.lunar.d=30;
  expect(lookupNatalStar(chart,'三台',options)).toMatchObject({status:'available',branch:'戌'});
  expect(lookupNatalStar(chart,'八座',options)).toMatchObject({status:'available',branch:'辰'});
});

it('stored duplicates are not double-counted and a mismatched new helper is rejected',()=>{
  const chart=structuredClone(charts[0]!.chart);
  chart.palaces.find((p)=>p.branch==='寅')!.stars.push({name:'天才',kind:'aux'});
  expect(lookupNatalStar(chart,'天才',options).status).toBe('available');
  chart.palaces.find((p)=>p.branch==='卯')!.stars.push({name:'天才',kind:'aux'});
  expect(lookupNatalStar(chart,'天才',options)).toMatchObject({status:'unknown',code:'conflicting-data'});
});

it('late-Zi default and witness option keep their distinct day-dependent star positions',()=>{
  const input:BirthInput={solar:{y:1990,m:3,d:21},time:{h:23,min:30},tz:'Etc/GMT-8',place:{lng:120,lat:30,label:'x'},sex:'female'};
  const own=cast(input),witness=cast({...input,options:{lateZiHour:'next-day'}});
  if(!own.ok||!witness.ok)throw Error('cast');
  expect(own.value.lunar.d+1).toBe(witness.value.lunar.d);
  for(const star of ['三台','八座','恩光','天貴']){
    const a=lookupNatalStar(own.value,star,options),b=lookupNatalStar(witness.value,star,options);
    if(a.status!=='available'||b.status!=='available')throw Error(star);
    expect(a.branch).not.toBe(b.branch);
  }
  expect(lookupNatalStar(own.value,'天空',options)).toMatchObject({branch:lookupNatalStar(witness.value,'天空',options).status==='available'?(lookupNatalStar(witness.value,'天空',options) as {branch:string}).branch:''});
});

it('all 72 preview charts have complete opt-in coverage without changing stored charts or empty palaces',()=>{
  expect(previews).toHaveLength(72);
  for(const fixture of previews){
    const r=cast(fixture.input as BirthInput);if(!r.ok)throw Error(r.message);
    const chart=r.value;const before=JSON.stringify(chart);
    const empty=chart.palaces.filter((p)=>!p.stars.some((s)=>s.kind==='major')).map((p)=>({branch:p.branch,borrow:p.borrowsFrom}));
    const coverage=natalStarCoverage(chart,undefined,options);
    expect(coverage).toHaveLength(44);expect(coverage.every((p)=>p.status==='available')).toBe(true);
    expect(new Set(coverage.map((p)=>p.star)).size).toBe(44);
    expect(chart.palaces.filter((p)=>!p.stars.some((s)=>s.kind==='major')).map((p)=>({branch:p.branch,borrow:p.borrowsFrom}))).toEqual(empty);
    expect(JSON.stringify(chart)).toBe(before);
  }
});
