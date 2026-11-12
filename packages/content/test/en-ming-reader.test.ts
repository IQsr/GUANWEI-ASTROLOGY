import { describe, expect, it } from 'vitest';
import { scanEnglish } from '../src/en/lint';
import { mingFact } from '../src/en/ming-facts';
import { headingEn } from '../src/en/ming-headings';
import reader from '../src/en/ming-reader.json';
import headings from '../src/en/ming-headings.json';

/** 2026-11-12 英文第一批：新版命宮、性格的骨架（reader-backed-v1）；第二批：十一宮（palace-reader-v1）嘅英文。 */
describe('新版命宮、骨架英文', () => {
  const rows = [...Object.entries((reader as { sentences: Record<string, string> }).sentences), ...Object.entries(headings as Record<string, string>)];
  it('譯文、小標題過英文檢查，冇殘留中文', () => {
    expect(rows.length).toBeGreaterThan(500);
    expect(rows.flatMap(([zh, en]) => [...scanEnglish(en).map((h) => `${JSON.stringify(h)}：${zh}`), ...(/[一-鿿]/.test(en) ? [`中文：${zh}`] : [])])).toEqual([]);
  });
  it('小標題：新版優先，舊版逐句稿嘅小標題照用', () => {
    expect(headingEn('盤面依據')).toBe('Evidence from your chart');
    expect(headingEn('冇呢個標題')).toBeNull();
  });
  it('按盤面填字嘅句：星名、宮名、地支都要對得上，對唔上回 null', () => {
    expect(mingFact('你的命宮是武曲、貪狼同坐丑宮。')).toBe('Your Life Palace holds Wu Qu and Tan Lang together in Chou.');
    expect(mingFact('你的命宮在酉，沒有主星，借對宮卯的太陽、天梁來讀。')).toBe('Your Life Palace, in You, holds no major star, so it is read through Tai Yang and Tian Liang from the opposite palace in Mao.');
    expect(mingFact('命宮四方實際坐曜的本命四化有：命宮天機化權、財帛宮天同化祿。')).toBe('In your Life Palace and its linked palaces, the birth-chart transformations are: Tian Ji turning to Authority in your Life Palace and Tian Tong turning to Abundance in your Wealth Palace.');
    expect(mingFact('本宮有貪狼化祿、祿存。')).toBe('This palace has Tan Lang turning to Abundance and Lu Cun.');
    expect(mingFact('本宮同度擎羊、火星。')).toBe('Qing Yang and Huo Xing also sit in this palace.');
    expect(mingFact('你的命宮是某星坐丑宮。')).toBeNull();
  });
  it('十一宮按盤面填字嘅句', () => {
    expect(mingFact('你的子女宮在午，天梁坐守。')).toBe('Your Children Palace is in Wu, held by Tian Liang.');
    expect(mingFact('你的夫妻宮在未，廉貞、七殺同宮。')).toBe('Your Partnership Palace is in Wei, with Lian Zhen and Qi Sha together.');
    expect(mingFact('你的兄弟宮在申，本宮沒有主星，借對宮寅的天機、太陰作參照。')).toBe('Your Siblings Palace, in Shen, has no major star, so it is read with reference to Tian Ji and Tai Yin from the opposite palace in Yin.');
    expect(mingFact('對宮命宮丑實坐紫微、破軍。')).toBe('The opposite palace, your Life Palace in Chou, holds Zi Wei and Po Jun.');
    expect(mingFact('本盤天府化科在福德宮亥同宮。')).toBe('In your chart, Tian Fu turning to Recognition sits in this palace, your Wellbeing Palace in Hai.');
    expect(mingFact('本盤辰時生，屬日生人；天鉞在疾厄宮未三方會照。')).toBe('You were born in the Chen hour, which counts as a daytime birth. In your chart, Tian Yue reaches this palace from your Health Palace in Wei, one of its linked palaces.');
    expect(mingFact('本盤左輔在遷移宮卯三方會照；右弼在財帛宮子對照。')).toBe('In your chart, Zuo Fu reaches this palace from your Travel Palace in Mao, one of its linked palaces; You Bi faces this palace from your Wealth Palace in Zi, the opposite palace.');
    expect(mingFact('本盤申時生，屬夜生人。')).toBe('You were born in the Shen hour, which counts as a night-time birth.');
    expect(mingFact('本盤某星在福德宮亥同宮。')).toBeNull();
  });
});
