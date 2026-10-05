import { describe, expect, it } from 'vitest';
import { questionText } from '../src/rectify';

describe('溯時題目英文（2026-10-05）', () => {
  it('七款題目都有英文，冇中文，歲數寫實歲', () => {
    for (const area of ['工作', '錢', '感情', '遷移', '家', '身體', 'turn'] as const) {
      const t = questionText({ year: 2014, area }, 1990, 'en');
      expect(t, area).not.toMatch(/[\u3400-\u9fff]/);
      expect(t, area).toMatch(/^Around 2014 \(when you were 23 or 24\): .+\?$/);
    }
    expect(questionText({ year: 2014, area: '工作' }, 1990)).toMatch(/^2014 年前後（你虛歲 25）：/);
  });
});
