import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokensEnabled } from '@/lib/tokens-gate';
import { cleanAsked, MAX_QUESTIONS } from '@/lib/dingshi.server';

/** 2026-10-08 security 檢查 🟠2：/tokens 收埋、定時辰答案唔信 client */
describe('/tokens 開唔開', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('開發模式開', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(tokensEnabled()).toBe(true);
  });

  it('production 預設關；GUANWEI_TOKENS=1 先開', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GUANWEI_TOKENS', '');
    expect(tokensEnabled()).toBe(false);
    vi.stubEnv('GUANWEI_TOKENS', '1');
    expect(tokensEnabled()).toBe(true);
  });
});

describe('cleanAsked：瀏覽器交返嚟嘅答案', () => {
  const ok = { q: { year: 2014, area: '工作' }, a: 'yes' };

  it('啱嘅照收', () => {
    expect(cleanAsked([ok])).toEqual([ok]);
  });

  it('形狀唔啱、重複：剷走', () => {
    expect(
      cleanAsked([
        ok,
        ok,
        { q: { year: 2014, area: '工作' }, a: 'maybe' },
        { q: { year: '2014', area: '錢' }, a: 'no' },
        { q: { year: 2015, area: '<script>' }, a: 'no' },
        { q: { year: 99999, area: '錢' }, a: 'no' },
        null,
        'x',
      ]),
    ).toEqual([ok]);
    expect(cleanAsked('not an array')).toEqual([]);
  });

  it('最多 MAX_QUESTIONS 題', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ q: { year: 1950 + i, area: '錢' }, a: 'no' }));
    expect(cleanAsked(many)).toHaveLength(MAX_QUESTIONS);
  });
});
