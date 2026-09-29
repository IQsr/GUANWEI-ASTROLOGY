import { describe, expect, it } from 'vitest';
import { BRANCHES, STEMS, cast, sanFangPalaces, solarFromLunar, type Branch, type Chart, type Palace, type Stem } from '../src/index';

/**
 * 工單 B5：王亭之《中州派紫微斗數深造講義》書中實例（2026-09）
 *
 * 呢本書冇印任何完整生辰（`book-charts.test.ts` 嗰種 fixture 抄唔到），
 * 但每個星系都有「現在且舉一實例」：講一半條件（丁年生人，巨門在午宮守命），
 * 再講盤上嘅結果（有祿存同度，巨門化忌，且為羊陀夾命）。
 *
 * 所以呢度倒轉做：**揾晒引擎排得出、又合前提嘅盤，逐條驗書講嘅結果。**
 *
 *   前提（premise）    年干（有時連年支）、命宮地支、某幾宮坐乜主星
 *   結果（claims）     由前提推得死嘅（四化、祿存、羊陀、魁鉞、宮干、宮名、大限干支）
 *                      → 每一張合前提嘅盤都要啱
 *                      由月、時決定嘅（輔弼、昌曲、火鈴、空劫、天馬）
 *                      → 最少有一張合前提嘅盤，連埋其餘結果一齊啱
 *
 * 書入面講嘅流曜（流羊、流陀）、大限四化、雜曜（天刑、天姚、紅鸞）引擎冇 / 唔喺本盤，唔抄。
 * 頁碼係 PDF 頁。
 */

type Tok = string; // '巨門' 或者 '巨門化忌'
type Claim =
  | ['same', Branch, Tok[]] //  同宮
  | ['only', Branch, string[]] //  主星正正係呢幾粒（[] = 無正曜）
  | ['sees', Branch, Tok[]] //  三方四正會到（空宮借對宮）
  | ['with', string, Tok[]] //  某主星嗰宮，同宮見
  | ['adj', Branch, Tok[]] //  鄰宮見
  | ['jia', Branch, [Tok, Tok]] //  夾：兩邊鄰宮各一
  | ['stem', Branch, Stem] //  宮干（大限干支嗰個干）
  | ['name', Branch, string] //  宮名
  | ['bright', Branch, string, string[]]; //  廟旺

type Example = {
  p: number;
  note: string;
  stem: Stem;
  yb?: Branch;
  ming: Branch;
  has?: Partial<Record<Branch, string[]>>;
  claims: Claim[];
};

const EXAMPLES: Example[] = [
  { p: 15, note: '天同戌 反背', stem: '丁', ming: '戌', has: { 戌: ['天同'] },
    claims: [['same', '戌', ['天同化權']], ['sees', '戌', ['太陰化祿', '天機化科']], ['same', '辰', ['巨門化忌']], ['name', '寅', '官祿']] },
  { p: 47, note: '破軍寅 丙年', stem: '丙', ming: '寅', has: { 寅: ['破軍'] },
    claims: [['stem', '寅', '庚'], ['sees', '寅', ['貪狼']], ['with', '貪狼', ['擎羊']], ['same', '申', ['武曲', '天相']], ['name', '申', '遷移'],
      ['jia', '申', ['天同化祿', '天梁']], ['stem', '辰', '壬']] },
  { p: 49, note: '廉府辰 乙年', stem: '乙', ming: '辰', has: { 辰: ['廉貞', '天府'] },
    claims: [['same', '辰', ['擎羊']], ['sees', '辰', ['紫微化科']]] },
  { p: 52, note: '太陰巳 辛年', stem: '辛', ming: '巳', has: { 巳: ['太陰'] },
    claims: [['sees', '巳', ['太陽化權', '祿存']], ['same', '酉', ['祿存']], ['with', '巨門', ['巨門化祿']], ['stem', '申', '丙'],
      ['sees', '巳', ['文曲化科']], ['bright', '巳', '太陰', ['陷']]] },
  { p: 58, note: '同巨未 父母 丙年', stem: '丙', ming: '午', has: { 未: ['天同', '巨門'] },
    claims: [['name', '未', '父母'], ['same', '未', ['天同化祿']], ['only', '卯', []], ['same', '酉', ['太陽', '天梁']],
      ['same', '丑', ['文昌化科', '文曲']]] },
  { p: 60, note: '武相寅 福德 丁年', stem: '丁', ming: '子', has: { 寅: ['武曲', '天相'], 子: ['貪狼'] },
    claims: [['name', '寅', '福德'], ['adj', '寅', ['巨門化忌']], ['sees', '寅', ['紫微', '祿存']]] },
  { p: 66, note: '太陰亥 七殺辰交友 癸年', stem: '癸', ming: '亥', has: { 亥: ['太陰'], 辰: ['七殺'] },
    claims: [['name', '辰', '僕役'], ['sees', '辰', ['破軍化祿', '貪狼化忌']], ['with', '貪狼', ['祿存']], ['stem', '申', '庚']] },
  { p: 69, note: '廉府辰 天機亥疾厄 甲年', stem: '甲', ming: '辰', has: { 辰: ['廉貞', '天府'], 亥: ['天機'] },
    claims: [['name', '亥', '疾厄'], ['only', '卯', []], ['same', '酉', ['太陽化忌', '天梁']], ['same', '卯', ['擎羊']], ['sees', '亥', ['太陽化忌']],
      ['stem', '午', '庚']] },
  { p: 72, note: '太陰戌 紫破未子女 丁年', stem: '丁', ming: '戌', has: { 戌: ['太陰'], 未: ['紫微', '破軍'] },
    claims: [['name', '未', '子女'], ['same', '未', ['擎羊']], ['stem', '卯', '癸'], ['same', '卯', ['武曲', '七殺']], ['same', '子', ['巨門化忌']]] },
  { p: 75, note: '命亥借廉貪 天府卯事業 壬年', stem: '壬', ming: '亥', has: { 巳: ['廉貞', '貪狼'], 卯: ['天府'] },
    claims: [['only', '亥', []], ['name', '卯', '官祿'], ['same', '卯', ['天府化科', '天魁']], ['same', '亥', ['祿存']], ['same', '巳', ['天鉞']],
      ['with', '天相', ['左輔', '右弼']], ['same', '未', ['天相']]] },
  { p: 78, note: '命申借同梁 甲年', stem: '甲', ming: '申', has: { 寅: ['天同', '天梁'] },
    claims: [['only', '申', []], ['same', '寅', ['祿存']], ['same', '戌', ['太陰']], ['name', '戌', '福德'], ['same', '辰', ['太陽化忌']],
      ['stem', '未', '辛'], ['same', '未', ['紫微', '破軍']]] },
  { p: 81, note: '廉貪巳 癸年', stem: '癸', ming: '巳', has: { 巳: ['廉貞', '貪狼'] },
    claims: [['same', '巳', ['貪狼化忌']], ['sees', '巳', ['破軍化祿']], ['stem', '辰', '丙'], ['only', '辰', ['太陰']]] },
  { p: 84, note: '巨門午 丁年', stem: '丁', ming: '午', has: { 午: ['巨門'] },
    claims: [['same', '午', ['巨門化忌', '祿存']], ['jia', '午', ['擎羊', '陀羅']], ['stem', '未', '丁'], ['only', '未', ['天相']],
      ['same', '巳', ['廉貞', '貪狼', '陀羅']]] },
  { p: 87, note: '天機子 天相疾厄 戊戌年', stem: '戊', yb: '戌', ming: '子', has: { 子: ['天機'] },
    claims: [['name', '未', '疾厄'], ['same', '未', ['天相']], ['sees', '未', ['貪狼化祿', '祿存']], ['same', '子', ['天機化忌']],
      ['sees', '子', ['擎羊', '陀羅']], ['stem', '戌', '壬']] },
  { p: 89, note: '巨門子 同梁寅福德 乙年', stem: '乙', ming: '子', has: { 子: ['巨門'] },
    claims: [['same', '寅', ['天同', '天梁']], ['name', '寅', '福德'], ['same', '午', ['天機']], ['name', '午', '遷移'],
      ['sees', '寅', ['太陰化忌']], ['sees', '午', ['太陰化忌']], ['stem', '卯', '己'], ['same', '卯', ['武曲', '七殺']]] },
  { p: 91, note: '紫破丑 戊戌年', stem: '戊', yb: '戌', ming: '丑', has: { 丑: ['紫微', '破軍'] },
    claims: [['same', '巳', ['廉貞', '貪狼化祿', '祿存']], ['name', '巳', '官祿'], ['same', '酉', ['武曲', '七殺']], ['name', '酉', '財帛'],
      ['stem', '辰', '丙'], ['same', '辰', ['太陰', '陀羅']], ['bright', '辰', '太陰', ['陷']], ['only', '子', ['天機']], ['same', '子', ['天機化忌']]] },
  { p: 94, note: '紫破丑 太陽戌子女 丁年', stem: '丁', ming: '丑', has: { 丑: ['紫微', '破軍'], 戌: ['太陽'] },
    claims: [['name', '戌', '子女'], ['sees', '戌', ['巨門化忌']], ['stem', '戌', '庚'], ['same', '未', ['天相', '擎羊']], ['same', '丑', ['火星']]] },
  { p: 95, note: '武殺卯 天機午田宅 己巳年', stem: '己', yb: '巳', ming: '卯', has: { 卯: ['武曲', '七殺'] },
    claims: [['name', '午', '田宅'], ['same', '午', ['天機', '祿存']], ['sees', '午', ['天梁化科']], ['jia', '午', ['擎羊', '陀羅']],
      ['stem', '酉', '癸'], ['only', '酉', ['天府']]] },
  { p: 105, note: '七殺申 貪狼辰財帛 甲年', stem: '甲', ming: '申', has: { 申: ['七殺'], 辰: ['貪狼'] },
    claims: [['name', '辰', '財帛'], ['same', '辰', ['鈴星']], ['stem', '巳', '己'], ['only', '巳', ['巨門']], ['only', '丑', ['天機']]] },
  { p: 108, note: '天梁未 巨門巳夫妻 癸年', stem: '癸', ming: '未', has: { 未: ['天梁'] },
    claims: [['name', '巳', '夫妻'], ['only', '巳', ['巨門']], ['same', '巳', ['巨門化權']], ['only', '亥', ['太陽']], ['bright', '亥', '太陽', ['陷']],
      ['sees', '巳', ['擎羊', '陀羅']], ['stem', '亥', '癸'], ['only', '酉', ['天同']]] },
  { p: 110, note: '貪狼戌 廉相子福德 丙年', stem: '丙', ming: '戌', has: { 戌: ['貪狼'] },
    claims: [['name', '子', '福德'], ['same', '子', ['廉貞化忌', '天相']], ['sees', '子', ['擎羊', '陀羅']]] },
  { p: 115, note: '七殺寅 辛年', stem: '辛', ming: '寅', has: { 寅: ['七殺'] },
    claims: [['same', '戌', ['貪狼', '擎羊']], ['same', '申', ['紫微', '天府', '陀羅']], ['same', '申', ['文昌化忌']], ['same', '子', ['廉貞', '天相']],
      ['name', '子', '夫妻']] },
  { p: 119, note: '紫府申 天同卯疾厄 戊年', stem: '戊', ming: '申', has: { 申: ['紫微', '天府'] },
    claims: [['name', '卯', '疾厄'], ['only', '卯', ['天同']], ['sees', '卯', ['天機化忌']], ['stem', '戌', '壬'], ['only', '戌', ['貪狼']], ['same', '辰', ['武曲']]] },
  { p: 125, note: '天梁未 太陽亥事業 丁年', stem: '丁', ming: '未', has: { 未: ['天梁'], 亥: ['太陽'] },
    claims: [['name', '亥', '官祿'], ['sees', '亥', ['巨門化忌', '擎羊', '陀羅']], ['same', '未', ['擎羊']], ['stem', '戌', '庚'],
      ['same', '戌', ['武曲']], ['same', '寅', ['紫微', '天府']], ['sees', '寅', ['祿存']]] },
  { p: 129, note: '破軍午 丁年', stem: '丁', ming: '午', has: { 午: ['破軍'] },
    claims: [['same', '午', ['祿存']], ['same', '子', ['廉貞', '天相', '火星']], ['stem', '巳', '乙'], ['same', '巳', ['太陽', '陀羅']],
      ['bright', '巳', '太陽', ['廟', '旺']]] },
  { p: 131, note: '天機未 丁年', stem: '丁', ming: '未', has: { 未: ['天機'] },
    claims: [['same', '亥', ['巨門化忌']], ['name', '亥', '官祿'], ['same', '未', ['擎羊']], ['stem', '未', '丁'], ['stem', '午', '丙'],
      ['same', '午', ['破軍']], ['same', '子', ['廉貞', '天相']]] },
  { p: 135, note: '天府丑 紫貪卯福德 丁年', stem: '丁', ming: '丑', has: { 丑: ['天府'], 卯: ['紫微', '貪狼'] },
    claims: [['name', '卯', '福德'], ['sees', '卯', ['天魁', '天鉞']], ['same', '未', ['文昌', '文曲']], ['stem', '卯', '癸'], ['only', '巳', ['天相']]] },
  { p: 138, note: '武破巳 巨門戌交友 己巳年', stem: '己', yb: '巳', ming: '巳', has: { 巳: ['武曲', '破軍'] },
    claims: [['name', '戌', '僕役'], ['only', '戌', ['巨門']], ['same', '午', ['太陽', '祿存']], ['stem', '寅', '丙'], ['only', '未', ['天府']],
      ['same', '未', ['擎羊']], ['same', '丑', ['廉貞', '七殺']]] },
  { p: 140, note: '天同戌 天相巳疾厄 癸年', stem: '癸', ming: '戌', has: { 戌: ['天同'], 巳: ['天相'] },
    claims: [['name', '巳', '疾厄'], ['sees', '巳', ['擎羊', '陀羅', '貪狼化忌']], ['adj', '巳', ['巨門化權']]] },
  { p: 143, note: '太陽子 天梁午遷移 壬年', stem: '壬', ming: '子', has: { 子: ['太陽'], 午: ['天梁'] },
    claims: [['name', '午', '遷移'], ['same', '午', ['天梁化祿']], ['same', '子', ['擎羊']], ['same', '戌', ['陀羅']], ['name', '戌', '夫妻'],
      ['same', '戌', ['鈴星']], ['sees', '子', ['天馬']]] },
  { p: 146, note: '天相亥 廉殺丑福德 丙年', stem: '丙', ming: '亥', has: { 亥: ['天相'] },
    claims: [['name', '丑', '福德'], ['same', '丑', ['廉貞化忌', '七殺']], ['stem', '丑', '辛']] },
  { p: 149, note: '天梁子 天同辰事業 丁年', stem: '丁', ming: '子', has: { 子: ['天梁'], 辰: ['天同'] },
    claims: [['name', '辰', '官祿'], ['same', '辰', ['天同化權', '火星', '地空']]] },
  { p: 152, note: '天相亥 武破巳遷移 庚年', stem: '庚', ming: '亥', has: { 亥: ['天相'], 巳: ['武曲', '破軍'] },
    claims: [['name', '巳', '遷移'], ['same', '巳', ['武曲化權']], ['stem', '寅', '戊'], ['same', '申', ['天機', '太陰', '祿存']],
      ['sees', '申', ['天同化忌']], ['jia', '申', ['擎羊', '陀羅']], ['same', '申', ['天馬', '火星']]] },
  { p: 159, note: '命酉借紫貪 天府丑事業 甲年', stem: '甲', ming: '酉', has: { 卯: ['紫微', '貪狼'], 丑: ['天府'] },
    claims: [['only', '酉', []], ['name', '丑', '官祿'], ['sees', '丑', ['廉貞化祿']], ['same', '丑', ['陀羅']], ['same', '卯', ['擎羊']],
      ['stem', '午', '庚'], ['only', '戌', ['天同']]] },
  { p: 162, note: '太陽子 機陰寅福德 庚年', stem: '庚', ming: '子', has: { 子: ['太陽'], 寅: ['天機', '太陰'] },
    claims: [['same', '子', ['太陽化祿']], ['name', '寅', '福德'], ['sees', '寅', ['天同化忌']], ['same', '申', ['祿存', '天馬']],
      ['stem', '卯', '己'], ['only', '巳', ['天相']]] },
  /*
   * 書印「廉貞在事業宮，與左輔、文曲同」。唔抄：命宮在辰嗰陣，左輔（辰起正月順）
   * 同文曲（辰起子時順）永遠隔兩宮 —— 任何生時都排唔出兩粒同宮，係書嘅筆誤，唔係引擎。
   */
  { p: 166, note: '紫相辰 戊年', stem: '戊', ming: '辰', has: { 辰: ['紫微', '天相'] },
    claims: [['same', '辰', ['陀羅']], ['same', '申', ['廉貞']], ['name', '申', '官祿'], ['same', '子', ['武曲', '天府']],
      ['name', '子', '財帛'], ['stem', '午', '戊'], ['same', '午', ['七殺', '擎羊']], ['same', '寅', ['貪狼化祿']]] },
  { p: 173, note: '武府子 丁年', stem: '丁', ming: '子', has: { 子: ['武曲', '天府'] },
    claims: [['same', '午', ['七殺', '祿存']], ['name', '午', '遷移'], ['with', '貪狼', ['火星']], ['stem', '申', '戊'], ['same', '申', ['廉貞']],
      ['same', '寅', ['貪狼']]] },
  { p: 177, note: '貪狼申 癸年', stem: '癸', ming: '申', has: { 申: ['貪狼'] },
    claims: [['same', '申', ['貪狼化忌']], ['same', '寅', ['廉貞']], ['same', '子', ['七殺', '祿存']], ['name', '子', '官祿'],
      ['same', '辰', ['破軍化祿']], ['name', '辰', '財帛'], ['same', '申', ['地劫']], ['same', '寅', ['地空']]] },
  { p: 184, note: '機巨卯 辛年', stem: '辛', ming: '卯', has: { 卯: ['天機', '巨門'] },
    claims: [['same', '卯', ['巨門化祿', '火星']], ['same', '子', ['武曲', '天府']], ['name', '子', '子女'], ['sees', '子', ['廉貞', '陀羅']]] },
  { p: 187, note: '機巨卯 丁年', stem: '丁', ming: '卯', has: { 卯: ['天機', '巨門'] },
    claims: [['same', '卯', ['巨門化忌']], ['same', '丑', ['太陰化祿', '太陽']], ['name', '丑', '夫妻'], ['sees', '丑', ['擎羊', '陀羅']],
      ['stem', '亥', '辛'], ['only', '酉', []]] },
  { p: 190, note: '紫相戌 丙年', stem: '丙', ming: '戌', has: { 戌: ['紫微', '天相'] },
    claims: [['sees', '戌', ['擎羊', '陀羅']], ['only', '申', ['貪狼']], ['name', '申', '夫妻'], ['same', '寅', ['廉貞化忌']],
      ['stem', '丑', '辛'], ['same', '亥', ['天梁']]] },
  { p: 193, note: '貪狼寅 丙年', stem: '丙', ming: '寅', has: { 寅: ['貪狼'] },
    claims: [['same', '申', ['廉貞化忌']], ['same', '卯', ['天機化權', '巨門']], ['name', '卯', '父母'], ['sees', '卯', ['天同化祿', '天魁', '天鉞']],
      ['stem', '巳', '癸'], ['only', '午', ['七殺']]] },
  { p: 197, note: '同陰子 壬年', stem: '壬', ming: '子', has: { 子: ['天同', '太陰'] },
    claims: [['sees', '子', ['天梁化祿']], ['same', '子', ['擎羊']], ['same', '巳', ['紫微化權', '七殺', '鈴星']], ['name', '巳', '僕役'],
      ['with', '武曲', ['武曲化忌']], ['stem', '巳', '乙'], ['only', '戌', []], ['same', '辰', ['天機', '天梁']]] },
  { p: 200, note: '武貪丑 甲年', stem: '甲', ming: '丑', has: { 丑: ['武曲', '貪狼'] },
    claims: [['same', '丑', ['武曲化科', '陀羅', '天魁', '鈴星']], ['same', '未', ['天鉞', '文昌', '文曲']], ['same', '酉', ['廉貞化祿', '破軍化權']],
      ['name', '酉', '財帛'], ['same', '卯', ['天相', '擎羊']], ['same', '巳', ['紫微', '七殺', '火星']], ['stem', '辰', '戊'],
      ['same', '辰', ['天機', '天梁']], ['same', '子', ['天同', '太陰']]] },
  /* 書印「廉貞破軍在丑」，廉破只會喺卯酉；事業宮武貪在丑 → 命宮喺酉。 */
  { p: 209, note: '廉破酉 丁年', stem: '丁', ming: '酉', has: { 酉: ['廉貞', '破軍'] },
    claims: [['same', '酉', ['天鉞']], ['same', '丑', ['武曲', '貪狼']], ['name', '丑', '官祿'], ['sees', '丑', ['擎羊', '陀羅']],
      ['stem', '亥', '辛'], ['only', '亥', ['天府']]] },
  { p: 212, note: '機梁辰 丁年', stem: '丁', ming: '辰', has: { 辰: ['天機', '天梁'] },
    claims: [['sees', '辰', ['太陰化祿', '天同化權', '天機化科', '巨門化忌']], ['same', '寅', ['太陽', '巨門化忌']], ['name', '寅', '夫妻']] },
  { p: 215, note: '命寅借陽巨 甲年', stem: '甲', ming: '寅', has: { 申: ['太陽', '巨門'] },
    claims: [['only', '寅', []], ['same', '申', ['太陽化忌']], ['jia', '寅', ['擎羊', '陀羅']], ['jia', '寅', ['火星', '鈴星']],
      ['only', '酉', ['天相']], ['name', '酉', '疾厄']] },
  { p: 218, note: '天府亥 壬年', stem: '壬', ming: '亥', has: { 亥: ['天府'] },
    claims: [['same', '亥', ['天府化科', '祿存']], ['same', '辰', ['天機', '天梁化祿']], ['name', '辰', '僕役'], ['sees', '辰', ['擎羊', '陀羅']],
      ['stem', '卯', '癸'], ['only', '申', []]] },
  { p: 235, note: '同陰午 丙年', stem: '丙', ming: '午', has: { 午: ['天同', '太陰'] },
    claims: [['same', '午', ['天同化祿']], ['stem', '申', '丙'], ['same', '申', ['太陽', '巨門']]] },
  { p: 235, note: '日月未 庚年', stem: '庚', ming: '未', has: { 未: ['太陽', '太陰'] },
    claims: [['same', '未', ['太陽化祿']], ['stem', '酉', '乙'], ['same', '酉', ['天機', '巨門']]] },
  { p: 334, note: '紫微午 壬年', stem: '壬', ming: '午', has: { 午: ['紫微'] },
    claims: [['same', '子', ['擎羊', '貪狼']], ['only', '未', []], ['same', '丑', ['天同', '巨門']], ['stem', '未', '丁']] },
  { p: 334, note: '紫微午 丙年', stem: '丙', ming: '午', has: { 午: ['紫微'] },
    claims: [['same', '午', ['擎羊']], ['stem', '未', '乙']] },
  { p: 334, note: '天機巳 丙年', stem: '丙', ming: '巳', has: { 巳: ['天機'] },
    claims: [['same', '巳', ['天機化權', '祿存']], ['stem', '未', '乙']] },
  { p: 336, note: '紫府寅 甲年', stem: '甲', ming: '寅', has: { 寅: ['紫微', '天府'] },
    claims: [['stem', '卯', '丁']] },
];

/** 由月、時（或者年支）定嘅星：前提冇講，所以只要求「有一張盤」啱 */
const LOOSE = new Set(['左輔', '右弼', '文昌', '文曲', '火星', '鈴星', '地空', '地劫', '天馬']);

const at = (c: Chart, b: Branch) => c.palaces.find((p) => p.branch === b)!;
const majors = (p: Palace) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
const opp = (b: Branch) => BRANCHES[(BRANCHES.indexOf(b) + 6) % 12]!;
const step = (b: Branch, n: number) => BRANCHES[(BRANCHES.indexOf(b) + n + 12) % 12]!;

/** 一個宮見唔見到某粒星（'巨門化忌' 要連化曜都對） */
function holds(p: Palace, t: Tok): boolean {
  const m = /^(.+)化([祿權科忌])$/.exec(t);
  const [name, hua] = m ? [m[1]!, m[2]!] : [t, null];
  return p.stars.some((s) => s.name === name && (hua === null || s.sihua === hua));
}

/** 三方四正嘅星，空宮借對宮（書講「借會」都係噉計） */
function seen(c: Chart, b: Branch): Palace[] {
  const four = sanFangPalaces(c.palaces, b);
  return four.flatMap((p) => (majors(p).length ? [p] : [p, at(c, opp(p.branch))]));
}

function check(c: Chart, cl: Claim): boolean {
  switch (cl[0]) {
    case 'same':
      return cl[2].every((t) => holds(at(c, cl[1]), t));
    case 'only':
      return [...majors(at(c, cl[1]))].sort().join() === [...cl[2]].sort().join();
    case 'sees':
      return cl[2].every((t) => seen(c, cl[1]).some((p) => holds(p, t)));
    case 'with': {
      const p = c.palaces.find((x) => majors(x).includes(cl[1]));
      return !!p && cl[2].every((t) => holds(p, t));
    }
    case 'adj':
      return cl[2].every((t) => holds(at(c, step(cl[1], -1)), t) || holds(at(c, step(cl[1], 1)), t));
    case 'jia': {
      const [l, r] = [at(c, step(cl[1], -1)), at(c, step(cl[1], 1))];
      const [a, b] = cl[2];
      return (holds(l, a) && holds(r, b)) || (holds(l, b) && holds(r, a));
    }
    case 'stem':
      return at(c, cl[1]).stem === cl[2];
    case 'name':
      return at(c, cl[1]).name === cl[2];
    case 'bright':
      return cl[3].includes(at(c, cl[1]).stars.find((s) => s.name === cl[2])?.brightness ?? '');
  }
}

const loose = (cl: Claim) => {
  const toks = cl[0] === 'with' ? cl[2] : cl[0] === 'jia' ? cl[2] : Array.isArray(cl[2]) ? cl[2] : [];
  return (toks as string[]).some((t) => LOOSE.has(t.replace(/化.$/, '')));
};

/* ── 盤池：每個年干揀兩年（年支唔同），逐個農曆月、日、時辰排 ── */
const pools = new Map<string, Chart[]>();
function pool(stem: Stem, yb?: Branch): Chart[] {
  const key = `${stem}${yb ?? ''}`;
  if (pools.has(key)) return pools.get(key)!;
  const years: number[] = [];
  for (let y = 1924; y < 2044 && years.length < (yb ? 1 : 2); y++) {
    const s = STEMS[(y - 4) % 10]!;
    const b = BRANCHES[(y - 4) % 12]!;
    if (s === stem && (!yb || b === yb) && !years.some((x) => (x - y) % 60 === 0 || (y - x) % 12 === 0)) years.push(y);
  }
  const out: Chart[] = [];
  for (const y of years)
    for (let m = 1; m <= 12; m++)
      for (let d = 1; d <= 30; d++) {
        const s = solarFromLunar(y, m, d, false);
        if (!s.ok) continue;
        for (let h = 0; h < 12; h++) {
          const r = cast({
            solar: s.value,
            time: { shichen: h as 0 },
            tz: 'Asia/Shanghai',
            place: { lng: 120, lat: 30, label: '東經 120 度' },
            sex: 'male',
            options: { trueSolarTime: false },
          });
          if (r.ok) out.push(r.value);
        }
      }
  pools.set(key, out);
  return out;
}

function matches(x: Example): Chart[] {
  return pool(x.stem, x.yb).filter(
    (c) =>
      c.ganzhi.year[0] === x.stem &&
      (!x.yb || c.ganzhi.year[1] === x.yb) &&
      c.mingGong === x.ming &&
      Object.entries(x.has ?? {}).every(([b, stars]) => stars!.every((s) => majors(at(c, b as Branch)).includes(s))),
  );
}

describe('《深造講義》書中實例（B5）', () => {
  it.each(EXAMPLES.map((x) => [`p.${x.p} ${x.note}`, x] as const))('%s', (_, x) => {
    const cs = matches(x);
    expect(cs.length, '引擎排唔出合前提嘅盤').toBeGreaterThan(0);
    const bad: string[] = [];
    const firm = x.claims.filter((cl) => !loose(cl));
    for (const cl of firm) {
      const n = cs.filter((c) => !check(c, cl)).length;
      if (n) bad.push(`${JSON.stringify(cl)}：${n}/${cs.length} 張盤唔啱`);
    }
    if (!cs.some((c) => x.claims.every((cl) => check(c, cl)))) {
      const soft = x.claims.filter(loose);
      if (soft.length) bad.push(`冇一張盤同時合晒：${soft.map((c) => JSON.stringify(c)).join('、')}`);
    }
    expect(bad).toEqual([]);
  }, 60_000);
});
