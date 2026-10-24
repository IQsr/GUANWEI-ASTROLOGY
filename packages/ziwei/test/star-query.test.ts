import { describe, expect, it } from 'vitest';
import { cast, BRANCHES, lookupNatalStar, queryNatalStar, natalStarCoverage, natalTableCoverage, HELPER_STARS, peachStars, tianxingBranch, type Chart, type BirthInput } from '../src/index';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
import wenmo from './fixtures/wenmo-charts.json';

const charts = fixtures.filter((f) => ['TL', 'A', 'C'].includes(f.id)).map((f) => {
  const r = cast(f.input as BirthInput); if (!r.ok) throw Error(r.message); return { id: f.id, chart: r.value };
});
const helperPositions = {
  TL: ['戌', '寅', '酉', '卯', '卯'], A: ['辰', '申', '未', '丑', '酉'], C: ['亥', '卯', '亥', '巳', '酉'],
};

describe('P0 unified native query', () => {
  it('all 33 positions are available; all five existing helpers retain their exact branches', () => {
    for (const {id, chart} of charts) {
      const before = JSON.stringify(chart);
      const coverage = natalStarCoverage(chart);
      expect(coverage).toHaveLength(33);
      expect(coverage.every((r) => r.status === 'available')).toBe(true);
      HELPER_STARS.forEach((star, i) => {
        const result = lookupNatalStar(chart, star);
        expect(result.status).toBe('available');
        if (result.status !== 'available') throw Error(star);
        expect(result.branch).toBe(helperPositions[id as keyof typeof helperPositions][i]);
        expect(result.source.method).toBe('liuyao-natal-v1');
        expect(result.source.references.length).toBeGreaterThan(1);
        expect(result.source.verification).toBe('transcription-not-original-collated');
      });
      expect(JSON.stringify(chart)).toBe(before);
      expect(chart.palaces.flatMap((p) => p.stars)).toHaveLength(28);
    }
  });

  it('palace, branch, same, sanfang and jia agree for every available star and every palace', () => {
    for (const {chart} of charts) for (const located of natalStarCoverage(chart)) {
      if (located.status !== 'available') throw Error(located.reason);
      for (const p of chart.palaces) for (const reach of ['same','sanfang','jia'] as const) {
        const delta = (BRANCHES.indexOf(located.branch) - BRANCHES.indexOf(p.branch) + 12) % 12;
        const expected = (reach === 'same' ? [0] : reach === 'sanfang' ? [0,4,6,8] : [1,11]).includes(delta) ? 'present' : 'absent';
        expect(queryNatalStar(chart,located.star,{palace:p.name,reach}).status).toBe(expected);
        expect(queryNatalStar(chart,located.star,{branch:p.branch,reach}).status).toBe(expected);
      }
    }
  });

  it('query layer also agrees with the independent Wenmo fixture positions', () => {
    let checked = 0;
    for (const fixture of wenmo) {
      const r = cast({solar:{y:fixture.birth.y,m:fixture.birth.m,d:fixture.birth.d},time:{h:fixture.birth.h,min:fixture.birth.min},tz:'Etc/GMT-8',place:{lng:120,lat:30,label:'x'},sex:fixture.yinyang.endsWith('男')?'male':'female'});
      if (!r.ok) throw Error(fixture.file);
      for (const star of HELPER_STARS) {
        const expected = Object.entries(fixture.palaces).find(([,p]) => p.stars.some(([s]) => s===star))?.[0];
        if (!expected) continue;
        expect(lookupNatalStar(r.value,star),`${fixture.file}/${star}`).toMatchObject({status:'available',branch:expected}); checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(90);
  });

  it('leap-month inputs reuse existing helper algorithms without reinterpreting the date', () => {
    for (const d of [1,15,16,30]) {
      const chart = structuredClone(charts[0]!.chart); chart.lunar = {...chart.lunar,m:4,d,isLeapMonth:true};
      const old = {...peachStars(chart),天刑:tianxingBranch(chart)};
      for (const star of HELPER_STARS) expect(lookupNatalStar(chart,star)).toMatchObject({status:'available',branch:old[star]});
    }
  });

  it('not implemented, missing placement/input and unsupported helper versions stay unknown', () => {
    const chart = structuredClone(charts[0]!.chart);
    expect(queryNatalStar(chart,'天哭',{palace:'命宮'})).toMatchObject({status:'unknown',code:'not-implemented'});
    chart.palaces.forEach((p)=>{p.stars=p.stars.filter((s)=>s.name!=='文昌');});
    expect(lookupNatalStar(chart,'文昌')).toMatchObject({status:'unknown',code:'missing-placement'});
    chart.lunar.m=0;
    expect(lookupNatalStar(chart,'天姚')).toMatchObject({status:'unknown',code:'missing-input'});
    expect(lookupNatalStar(chart,'天刑')).toMatchObject({status:'unknown',code:'missing-input'});
    expect(lookupNatalStar(chart,'紅鸞').status).toBe('available'); // does not require lunar month
    chart.meta.engineVersion='0.3.0';
    expect(lookupNatalStar(chart,'天刑')).toMatchObject({status:'unknown',code:'unsupported-version'});
    expect(lookupNatalStar(chart,'紫微').status).toBe('available'); // explicit stored native position
  });

  it('missing year input does not erase month-based helpers', () => {
    const chart = structuredClone(charts[0]!.chart) as Chart;
    delete (chart as Partial<Chart>).ganzhi;
    expect(lookupNatalStar(chart,'紅鸞')).toMatchObject({status:'unknown',code:'missing-input'});
    expect(lookupNatalStar(chart,'天姚').status).toBe('available');
  });

  it('duplicates and conflicting helper records are unknown; a query never mutates or caches stale charts', () => {
    const chart = structuredClone(charts[0]!.chart);
    const hit = lookupNatalStar(chart,'紅鸞'); if(hit.status!=='available') throw Error(hit.reason);
    chart.palaces.find((p)=>p.branch===hit.branch)!.stars.push({name:'紅鸞',kind:'aux'});
    expect(lookupNatalStar(chart,'紅鸞').status).toBe('available');
    chart.palaces.find((p)=>p.branch===hit.branch)!.stars.push({name:'紅鸞',kind:'aux'});
    expect(lookupNatalStar(chart,'紅鸞')).toMatchObject({status:'unknown',code:'conflicting-data'});
    chart.palaces.forEach((p)=>{p.stars=p.stars.filter((s)=>s.name!=='紅鸞');});
    chart.palaces.find((p)=>p.branch!==hit.branch)!.stars.push({name:'紅鸞',kind:'aux'});
    expect(lookupNatalStar(chart,'紅鸞')).toMatchObject({status:'unknown',code:'conflicting-data'});
  });

  it('empty-palace borrowing does not relocate majors, helper stars, auxiliary stars or hua', () => {
    const chart=charts.find((f)=>f.id==='C')!.chart;
    expect(queryNatalStar(chart,'太陽',{palace:'官祿'}).status).toBe('absent');
    expect(queryNatalStar(chart,'太陽',{palace:'夫妻'}).status).toBe('present');
    expect(queryNatalStar(chart,'天馬',{palace:'官祿'}).status).toBe('present');
    expect(queryNatalStar(chart,'火星',{palace:'官祿'}).status).toBe('absent');
    expect(queryNatalStar(chart,'天刑',{palace:'命宮'}).status).toBe('absent');
  });
});

it('coverage exposes source/table status without promoting it to original-book verification', () => {
  const chart=structuredClone(charts[0]!.chart);
  const coverage=natalTableCoverage(chart);
  expect(coverage.brightness.status).toBe('available');
  expect(coverage.brightness.levels).toHaveLength(7);
  expect(coverage.brightness.originalBookTable).toBe('not-collated');
  expect(coverage.sihua.status).toBe('available');
  expect(coverage.sihua.verification).toBe('primary-text-partial');
  expect(coverage.dayNight.status).toBe('not-implemented');
  chart.palaces.flatMap((p)=>p.stars).find((s)=>s.name==='紫微')!.brightness=undefined;
  expect(natalTableCoverage(chart).brightness).toMatchObject({status:'unknown',missing:['紫微']});
  chart.palaces.flatMap((p)=>p.stars).find((s)=>s.sihua)!.sihua=undefined;
  expect(natalTableCoverage(chart).sihua.status).toBe('unknown');
});
