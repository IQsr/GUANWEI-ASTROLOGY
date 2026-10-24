import {expect,it} from 'vitest';
import {cast,lookupNatalStar,queryNatalStar,natalStarCoverage,P1B_STARS,STEMS,type BirthInput,type Chart} from '../src/index';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
import previews from '../../../apps/web/src/lib/free-ming-preview.json';
import wenmo from './fixtures/wenmo-charts.json';
const rows=fixtures.filter((f)=>['TL','A','C'].includes(f.id)).map((f)=>{const r=cast(f.input as BirthInput);if(!r.ok)throw Error(r.message);return{id:f.id,chart:r.value,sex:f.input.sex as 'male'|'female'};});
const query=(birthSex?:'male'|'female')=>({catalogue:'p1b' as const,...(birthSex?{birthSex}:{})});
const expected={TL:['子','子','卯','亥','午'],A:['子','寅','辰','戌','午'],C:['戌','戌','巳','戌','午']};

it('P1b adds five explicit native placements; P0, P1a and historic Chart remain unchanged',()=>{
  for(const {id,chart,sex} of rows){
    const before=JSON.stringify(chart);
    expect(natalStarCoverage(chart)).toHaveLength(33);expect(natalStarCoverage(chart,undefined,{catalogue:'p1a'})).toHaveLength(44);
    const positions=natalStarCoverage(chart,undefined,query(sex));expect(positions).toHaveLength(49);expect(positions.every((p)=>p.status==='available')).toBe(true);
    P1B_STARS.forEach((star,i)=>{
      expect(lookupNatalStar(chart,star,query(sex))).toMatchObject({status:'available',branch:expected[id as keyof typeof expected][i],source:{method:'minor-p1b-v1',verification:'transcription-not-original-collated'}});
      expect(lookupNatalStar(chart,star)).toMatchObject({status:'unknown',code:'not-enabled'});
      expect(lookupNatalStar(chart,star,{catalogue:'p1a'})).toMatchObject({status:'unknown',code:'not-enabled'});
    });
    expect(chart.palaces.flatMap((p)=>p.stars)).toHaveLength(28);expect(JSON.stringify(chart)).toBe(before);
  }
});

it('105 witness placements retain 88 agreements and exactly 17 source-documented 天傷 divergences',()=>{
  const differences:Record<string,[string,string]>={
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`A${String(i+1).padStart(2,'0')}-紫微${['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][i]}.pdf`,['寅','子']])),
    'B01-晚子時.pdf':['卯','丑'],'B02-晚子時對照.pdf':['辰','寅'],'B05-閏上半月2.pdf':['巳','卯'],'B06-閏下半月2.pdf':['午','辰'],'B09-英國跨日.pdf':['午','辰'],
  };
  let matched=0,documented=0;
  for(const f of wenmo){
    const sex=f.yinyang.endsWith('男')?'male':'female';
    const r=cast({solar:{y:f.birth.y,m:f.birth.m,d:f.birth.d},time:{h:f.birth.h,min:f.birth.min},tz:'Etc/GMT-8',place:{lng:120,lat:30,label:'x'},sex,...(f.birth.h===23?{options:{lateZiHour:'next-day' as const}}:{})});
    if(!r.ok)throw Error(f.file);
    for(const star of P1B_STARS){
      const actual=lookupNatalStar(r.value,star,query(sex));if(actual.status!=='available')throw Error(actual.reason);
      const other=Object.entries(f.palaces).find(([,p])=>p.stars.some(([s])=>s===star))?.[0];expect(other,f.file+'/'+star).toBeDefined();
      const difference=star==='天傷'?differences[f.file]:undefined;
      if(difference){
        expect([actual.branch,other],f.file).toEqual(difference);expect(f.yinyang).toBe('陰男');expect(actual.palace).toBe('疾厄');
        expect(r.value.palaces.find((p)=>p.name==='僕役')!.branch).toBe(other);documented++;
      }else{expect(actual.branch,f.file+'/'+star).toBe(other);matched++;}
    }
  }
  expect([matched,documented,matched+documented]).toEqual([88,17,105]);
});

it('天傷 explicitly covers all four 陰陽男女 cases and missing sex stays unknown',()=>{
  const chart=structuredClone(rows[0]!.chart);
  for(const [stem,sex,palace] of [['甲','male','僕役'],['乙','female','僕役'],['甲','female','疾厄'],['乙','male','疾厄']] as const){
    chart.ganzhi.year[0]=stem;
    expect(lookupNatalStar(chart,'天傷',query(sex))).toMatchObject({status:'available',palace,source:{inputValues:{birthSex:sex}}});
  }
  expect(lookupNatalStar(chart,'天傷',query())).toMatchObject({status:'unknown',code:'missing-input'});
  // Other four stars do not need birth sex. No sex is inferred from stored decadals.
  for(const star of P1B_STARS.filter((s)=>s!=='天傷'))expect(lookupNatalStar(chart,star,query()).status).toBe('available');
});

it('source year table covers ten stems and retains the Initial 天虛 寅年 example',()=>{
  const chart=structuredClone(rows[0]!.chart);
  for(const [i,stem] of STEMS.entries()){
    chart.ganzhi.year[0]=stem;
    expect(lookupNatalStar(chart,'天官',query())).toMatchObject({branch:['未','辰','巳','寅','卯','酉','亥','酉','戌','午'][i]});
    expect(lookupNatalStar(chart,'天福',query())).toMatchObject({branch:['酉','申','子','亥','卯','寅','午','巳','午','巳'][i]});
  }
  // Initial transcript's 寅年 example: 天虛 in 申; no lookup for the deferred 天哭.
  chart.ganzhi.year[1]='寅';expect(lookupNatalStar(chart,'天虛',query())).toMatchObject({branch:'申'});
  expect(lookupNatalStar(chart,'天哭',query())).toMatchObject({status:'unknown',code:'not-implemented'});
  expect(lookupNatalStar(chart,'天使',query())).toMatchObject({status:'unknown',code:'not-implemented'});
});

it('陰煞 handles the six-month repeating sequence, leap day 15/16 and month 12 rollover',()=>{
  const chart=structuredClone(rows[0]!.chart);chart.lunar.isLeapMonth=false;
  for(let m=1;m<=12;m++){chart.lunar.m=m;expect(lookupNatalStar(chart,'陰煞',query())).toMatchObject({branch:['寅','子','戌','申','午','辰'][((m-1)%6)]});}
  chart.lunar.isLeapMonth=true;chart.lunar.m=2;chart.lunar.d=15;
  expect(lookupNatalStar(chart,'陰煞',query())).toMatchObject({branch:'子'});
  chart.lunar.d=16;expect(lookupNatalStar(chart,'陰煞',query())).toMatchObject({branch:'戌'});
  chart.lunar.m=12;expect(lookupNatalStar(chart,'陰煞',query())).toMatchObject({branch:'寅'});
});

it('inputs, version and stored placement conflicts never become confirmed absence',()=>{
  const chart=structuredClone(rows[0]!.chart);chart.lunar.d=0;
  expect(lookupNatalStar(chart,'陰煞',query())).toMatchObject({status:'unknown',code:'missing-input'});
  expect(lookupNatalStar(chart,'天虛',query()).status).toBe('available');
  chart.meta.engineVersion='0.3.0';for(const star of P1B_STARS)expect(lookupNatalStar(chart,star,query('female'))).toMatchObject({status:'unknown',code:'unsupported-version'});
  const conflict=structuredClone(rows[0]!.chart);conflict.palaces.find((p)=>p.name==='命宮')!.stars.push({name:'天傷',kind:'aux'});
  expect(queryNatalStar(conflict,'天傷',{palace:'命宮'},query('female'))).toMatchObject({status:'unknown',code:'conflicting-data'});
  const incomplete=structuredClone(rows[0]!.chart);incomplete.palaces=incomplete.palaces.filter((p)=>p.name!=='疾厄');
  expect(lookupNatalStar(incomplete,'天傷',query('female')).status).toBe('unknown');
});

it('72 preview charts retain complete 49-star pilot coverage and no native star or borrow relocation',()=>{
  for(const f of previews){
    const r=cast(f.input as BirthInput);if(!r.ok)throw Error(r.message);const before=JSON.stringify(r.value);
    const all=natalStarCoverage(r.value,undefined,query(f.input.sex as 'male'|'female'));
    expect(all).toHaveLength(49);expect(all.every((p)=>p.status==='available')).toBe(true);expect(JSON.stringify(r.value)).toBe(before);
    const injury=lookupNatalStar(r.value,'天傷',query(f.input.sex as 'male'|'female'));
    expect(injury.status==='available'&&['僕役','疾厄'].includes(injury.palace)).toBe(true);
    expect(queryNatalStar(r.value,'天傷',{palace:'命宮'},query(f.input.sex as 'male'|'female')).status).toBe('absent');
  }
});
