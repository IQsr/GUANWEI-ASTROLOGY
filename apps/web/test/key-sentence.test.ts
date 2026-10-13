import { describe, expect, it } from 'vitest';
import { keyRange } from '@/lib/key-sentence';

const pick = (slot: string, t: string) => {
  const r = keyRange(slot, t);
  return r ? t.slice(r[0], r[1]) : null;
};

describe('重點句加粗（2026-10-13）', () => {
  it('結論段：第一句', () => {
    expect(pick('結論', '你在感情裡自然站在照顧的一方。但你少把自己的需要放上檯面。')).toBe('你在感情裡自然站在照顧的一方。');
  });
  it('第一句係交代資料就揀下一句（這十年、這一年、一生十二步）', () => {
    expect(pick('結論', '寫這本書時（二〇二六年），你虛歲三十七，正行第四個大限。這十年，你的家比較順，朋友圈要多留神。')).toBe('這十年，你的家比較順，朋友圈要多留神。');
    expect(pick('結論', '你的大限由虛歲五歲起，每十年換一步；寫這本書時（二〇二六年），你走到第五步。')).toBeNull();
  });
  it('英文一樣', () => {
    expect(pick('結論', 'You hold yourself to a high standard. The catch: you tend to go it alone.')).toBe('You hold yourself to a high standard.');
    expect(pick('結論', 'When this book was written (2026), you were 36. Over these ten years, home goes well.')).toBe('Over these ten years, home goes well.');
  });
  it('其他段唔加粗', () => {
    expect(pick('結構', '天梁照顧、承擔。')).toBeNull();
    expect(pick('偏向', '你偏向原則。也有浪漫的一面。')).toBe('你偏向原則。');
  });
});
