import {MAJOR_STARS} from '@guanwei/ziwei';
import {evaluatePilotRules,type P1aRule} from './pilot-analysis';
import type {BookAnalysis} from './analysis-record';
import type {RuleDecision} from './analysis-contract';
import sourceData from './cards/book-p1-sources.json';

export const BOOK_P1_VERSION='book-p1-conditions-v1';
export const LIAN_KEWEN='book.p1.v1.lianji-changke';
export const TONG_JI='book.p1.v1.tonglu-jiquan';
const alone=(star:string)=>({not:{meets:star,stars:MAJOR_STARS.filter(s=>s!==star),reach:'same' as const}});
export const BOOK_P1_CARDS:readonly (P1aRule&{chapters:string[];nativePalaces:string[];scope:string;directBlocks:string[]})[]=[
 {id:LIAN_KEWEN,groups:[],title:'廉貞忌與科文同度：已核文昌科子集',chapters:['福德'],nativePalaces:['福德'],
  scope:'這裡讀本命福德廉貞獨坐寅申、廉貞化忌、文昌化科實坐同度。這是科文諸曜的一個已核子集，並非科文全目錄。',
  when:{all:[{star:'廉貞',in:{name:'福德'}},{star:'廉貞',at:['寅','申']},alone('廉貞'),{star:'廉貞',hua:'忌',layer:'natal'},{star:'文昌',hua:'科',layer:'natal'},{together:['廉貞','文昌']}]},
  sources:['book.p1.v1:lian-wellbeing','book.p1.v1:kewen-membership'],directBlocks:['wtz.deep.p573.b011','wtz.deep.p574.b001','wtz.deep.p574.b002'],
  conditions:['主語是本命福德的內在投入與享受；廉貞化忌與科文諸曜須實坐同度，對拱、三合或借入不代替同度。','這裡依文昌本命化科辨認這個科文子集。PDF46以文昌化科同度作科文例證；只用來辨認類別，不移用該頁七殺、破軍的判詞。','廉貞獨坐寅申是這段解讀的範圍；其他廉貞同宮組合另有574頁分支，並非一律不成立。'],
  exceptions:['藝術傾向、感覺敏銳與精神享受，仍帶「多譏評、不能隨遇而安」的修飾，不能改寫為已經安逸。','廉貞獨坐仍保留多思慮；忙碌所得的樂趣不等於只要忙就滿足。','未命中文昌科子集，不等於確認沒有其他科文配合；龍池鳳閣等範圍留待逐項核定。','不由此指定藝術職業、實際嗜好、成就或往事；原文病名及私人標籤不轉為本人的診斷。'],
  explanation:'廉貞忌、文昌科同度，兼具忙碌中求樂、藝術感受與難以隨遇而安；正面感受沒有抹去多思慮與挑剔。'},
 {id:TONG_JI,groups:[],title:'天同卯酉化祿、官祿天機化權的策動支持',chapters:['命宮','官祿'],nativePalaces:['命宮','官祿'],
  scope:'本命天同獨坐卯酉命宮化祿，官祿天機獨坐化權；對宮太陰、三合巨門的星系結構同時核對。',
  when:{all:[{star:'天同',in:{name:'命宮'}},{star:'天同',at:['卯','酉']},alone('天同'),{star:'天同',hua:'祿',layer:'natal'},{star:'天機',in:{name:'官祿'}},alone('天機'),{star:'天機',hua:'權',layer:'natal'},{opposite:['天同','太陰']},alone('太陰'),{sanfangOf:{name:'命宮'},contains:'巨門'},alone('巨門')]},
  sources:['book.p1.v1:tong-natal','book.p1.v1:tong-time-comparison'],directBlocks:['wtz.deep.p116.b003','wtz.deep.p116.b011'],
  conditions:['主語是本命天同獨坐卯酉命宮，官祿天機化權；四化均為本命，星曜及四化留在原宮，不以借入當實坐。','PDF116.b011明言天同化祿時，事業宮天機化權成為策動力；本支已成立，可說明精神投入有推動的支點。','同節煞忌、福德太陽與巨門條件分開保存；這裡不另外替這些尚未完整核定的分支選答案。'],
  exceptions:['天同化權、太陰化祿而巨門化忌是116.b012另一支，不能與本支互換。','卯酉祿存、太陰忌及福德太陽的分支有各自前提，不因見某一星便同時套用。','117頁「經行」及原局機權再逢運限機祿，論的是運限；未有該時間層資料，不寫成一生佳運或某年事件。','策動支持不等於物質必富、每次轉變有利、已確定職業，亦不作情緒或疾病診斷。'],
  explanation:'天同本命祿與官祿天機本命權已相配，策動力可以把精神投入接到行動；不再只有空虛、充實的未定比較。'}
];

/** Evaluate once with the existing condition language. Writers consume these very decisions. */
export function collectBookP1Decisions(ledger:BookAnalysis):RuleDecision[]{
 const results=evaluatePilotRules(ledger.chart,BOOK_P1_CARDS,{catalogue:'p1b',birthSex:ledger.context.birthSex??undefined},BOOK_P1_VERSION);
 return results.map(result=>{
  const card=BOOK_P1_CARDS.find(c=>c.id===result.id)!;
  const native=card.nativePalaces.map(name=>{const p=ledger.chart.palaces.find(p=>p.name===name);return {palace:name,borrowsFrom:p?.borrowsFrom??null,hasNativeMajor:!!p?.stars.some(s=>s.kind==='major')};});
  ledger.pilot(result,card.chapters,{when:card.when,nativePalaces:card.nativePalaces,scope:card.scope,version:BOOK_P1_VERSION,sourceReview:{book:'王亭之《中州派紫微斗數深造講義》',pdfSha256:sourceData.pdf_sha256,reviewed:'2026-10-25',blocks:card.sources.map(id=>(sourceData.sources as Record<string,{blockFingerprints:Record<string,string>}>)[id.slice('book.p1.v1:'.length)]!.blockFingerprints)}},{native});
  const decision=ledger.decisions.at(-1)!;
  decision.adapter=BOOK_P1_VERSION;
  // A contradictory native+borrow marker is missing/inconsistent input, never a positive native card.
  if(native.some(p=>p.borrowsFrom&&p.hasNativeMajor)){
   decision.status='unknown_input';decision.presentation='not_selected';decision.presentationReason='conflicting native/borrow marker';
  }
  decision.qualifiers=[card.scope,...card.exceptions];
  return decision;
 });
}
