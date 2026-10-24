import { BRANCHES, STEMS, type Branch, type Chart } from '../types';
import { monthForPalace } from './palaces';

export const P1B_STAR_VERSION = 'minor-p1b-v1';
export const P1B_STARS = ['陰煞', '天虛', '天傷', '天官', '天福'] as const;
export type P1bStar = typeof P1B_STARS[number];
export const P1B_INITIAL_SOURCE_SHA256 = '0f9f208e963cbb5e00c2264bae5aa4da9b482231f6c44e50df7c3abb81ff4a12';
const ids = (...n: number[]) => n.map((p) => `wtz.initial.07.p${String(p).padStart(4, '0')}`);
export const P1B_STAR_REFERENCES: Record<P1bStar, readonly string[]> = {
  陰煞: ids(173,174,175), 天虛: ids(122,123,124,125), 天傷: ids(176,177,178,179),
  天官: ids(99,100,101,102,103), 天福: ids(99,100,101,102,103),
};
export const P1B_STAR_INPUTS: Record<P1bStar, readonly string[]> = {
  陰煞: ['lunar.m','lunar.d','lunar.isLeapMonth','rules.R-006'], 天虛: ['ganzhi.year.branch'],
  天傷: ['ganzhi.year.stem','query.birthSex','native.僕役','native.疾厄','native.遷移'],
  天官: ['ganzhi.year.stem'], 天福: ['ganzhi.year.stem'],
};
export type P1bPlacementOptions = { birthSex?: 'male' | 'female' };
type Missing = { status:'unknown'; code:'missing-input'|'conflicting-data'|'unsupported-version'; reason:string };
type Derived = { status:'available'; branch:Branch; dependencies:{star:string;branch:Branch}[]; notes:string[] };
const at = (i:number) => BRANCHES[((i%12)+12)%12]!;
const GUAN = ['未','辰','巳','寅','卯','酉','亥','酉','戌','午'] as const;
const FU = ['酉','申','子','亥','卯','寅','午','巳','午','巳'] as const;

/** Separate opt-in catalogue. Birth sex is explicit because the historic Chart does not retain it. */
export function deriveP1bStar(chart:Chart,star:P1bStar,options:P1bPlacementOptions):Derived|Missing {
  if(chart.meta?.engineVersion!=='0.4.0')return {status:'unknown',code:'unsupported-version',reason:`${star} 尚未核此盤版本的安法`};
  if(star==='陰煞'){
    const l=chart.lunar;
    if(!l||!Number.isInteger(l.m)||l.m<1||l.m>12||!Number.isInteger(l.d)||l.d<1||l.d>30||typeof l.isLeapMonth!=='boolean')
      return {status:'unknown',code:'missing-input',reason:'陰煞缺少有效農曆月、日或閏月資料'};
    const m=monthForPalace(l.m,l.d,l.isLeapMonth);
    return {status:'available',branch:at(2-2*(m-1)),dependencies:[],notes:['初階第7篇生月口訣；閏月沿專案R-006前半本月、後半次月，不重複移宮。']};
  }
  if(star==='天虛'){
    const y=BRANCHES.indexOf(chart.ganzhi?.year?.[1]);
    if(y<0)return {status:'unknown',code:'missing-input',reason:'天虛缺少有效生年地支'};
    return {status:'available',branch:at(6+y),dependencies:[],notes:['由午起子年順數，與天哭的逆行安法分開；本批未實作天哭。']};
  }
  const stem=STEMS.indexOf(chart.ganzhi?.year?.[0]);
  if(stem<0)return {status:'unknown',code:'missing-input',reason:`${star} 缺少有效生年天干`};
  if(star==='天官'||star==='天福')return {status:'available',branch:(star==='天官'?GUAN:FU)[stem]!,dependencies:[],notes:['天官、天福各依生年干安星，不要求兩星同宮或成對才可查。']};
  if(options.birthSex!=='male'&&options.birthSex!=='female')
    return {status:'unknown',code:'missing-input',reason:'天傷須明確提供出生性別，舊Chart未保存；不從姓名、配偶、樣本ID或大限逆推。'};
  const forward=(stem%2===0)===(options.birthSex==='male');
  const names=['僕役','疾厄','遷移'] as const;
  const palaces=names.map((name)=>chart.palaces?.filter((p)=>p.name===name)??[]);
  if(palaces.some((p)=>p.length!==1||!BRANCHES.includes(p[0]!.branch)))
    return {status:'unknown',code:'missing-input',reason:'天傷缺少唯一有效僕役、疾厄或遷移宮'};
  const [friends,health,travel]=palaces.map((ps)=>ps[0]!);
  const ti=BRANCHES.indexOf(travel!.branch);
  if(friends!.branch!==at(ti-1)||health!.branch!==at(ti+1))
    return {status:'unknown',code:'conflicting-data',reason:'傷使所依的僕役、疾厄未按本命宮序分居遷移兩側'};
  return {status:'available',branch:(forward?friends!:health!).branch,
    dependencies:names.map((name,i)=>({star:`宮位:${name}`,branch:palaces[i]![0]!.branch})),
    notes:[`初階07.177–179：${forward?'陽男陰女，天傷在僕役':'陰男陽女，天傷在疾厄'}；天使仍屬後續批次，未由本條宣稱已實作。`]};
}
