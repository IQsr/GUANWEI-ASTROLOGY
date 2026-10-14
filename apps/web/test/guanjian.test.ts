import { describe, expect, it } from 'vitest';
import { keywordMarks, SHEN, SHUN, TI, SHEN_HANS, SHUN_HANS, TI_HANS } from '@/lib/guanjian';
import { hans } from '@/lib/hans';

const show = (t: string) => keywordMarks(t).map((m) => `${m.kind}:${t.slice(m.start, m.end)}`);

describe('關鍵字標記', () => {
  it('判語同主題字：主題字跟判語喺同一分句先標', () => {
    expect(show('這一年，你的心境順中有阻，朋輩要多留神。')).toEqual(['ti:心境', 'shen:順中有阻', 'ti:朋輩', 'shen:要多留神']);
    /* 判語喺另一分句（中間有逗號）就唔標 —— 免得成版記號 */
    expect(show('你的心境很好，朋輩要多留神。')).toEqual(['ti:朋輩', 'shen:要多留神']);
  });

  it('長詞先：「比較順」唔會切成「較順」', () => {
    expect(show('心境上，這一年比較順。')).toEqual(['shun:比較順']);
  });

  it('單獨「留意」唔標；「要留意的是」標', () => {
    expect(show('留意別因安逸而少了進取。')).toEqual([]);
    expect(show('要留意的是，你最怕的不是錢少。')).toEqual(['shen:要留意的是']);
  });

  it('月份只標逐月清單（有冒號）', () => {
    expect(show('二月：作息容易上軌道。七月：整體多些阻滯，凡事穩一點。')).toEqual(['yue:二月', 'yue:七月', 'shen:多些阻滯']);
    expect(show('寫這本書的二〇二六年是丙午年，農曆二月出生。')).toEqual([]);
  });

  it('冇判語嘅分句，主題字唔標', () => {
    expect(show('你在感情裡擅長維持。')).toEqual([]);
  });

  it('⚠ 簡體字表同 hans() 轉出嚟一樣（改繁體表要一齊改）', () => {
    expect(SHEN_HANS).toEqual(SHEN.map(hans));
    expect(SHUN_HANS).toEqual(SHUN.map(hans));
    expect(TI_HANS).toEqual(TI.map(hans));
  });

  it('簡體正文一樣標到', () => {
    const t = hans('這一年，你的心境順中有阻，朋輩要多留神。心境上，這一年比較順。');
    expect(show(t)).toEqual(['ti:心境', 'shen:顺中有阻', 'ti:朋辈', 'shen:要多留神', 'shun:比较顺']);
  });

});
