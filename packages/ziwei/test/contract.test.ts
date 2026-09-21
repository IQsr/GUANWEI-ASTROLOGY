import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  DEFAULT_RULES,
  ENGINE_VERSION,
  PALACE_NAMES,
  STEMS,
  SUPPORTED_YEARS,
  cast,
  castPartial,
  resolveRules,
  type BirthInput,
} from '../src/index';

const SAMPLE: BirthInput = {
  solar: { y: 1998, m: 3, d: 12 },
  time: { h: 7, min: 40 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.1694, lat: 22.3193, label: '香港' },
  sex: 'male',
};

describe('契約', () => {
  it('十天干十二地支十二宮數目正確', () => {
    expect(STEMS).toHaveLength(10);
    expect(BRANCHES).toHaveLength(12);
    expect(PALACE_NAMES).toHaveLength(12);
    expect(new Set(BRANCHES).size).toBe(12);
    expect(new Set(PALACE_NAMES).size).toBe(12);
  });

  it('引擎版本係 semver', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('萬年曆範圍係 1900–2100', () => {
    expect(SUPPORTED_YEARS.from).toBe(1900);
    expect(SUPPORTED_YEARS.to).toBe(2100);
  });
});

describe('預設流派選項（docs/rules.md）', () => {
  it('三個分歧點嘅預設值鎖死', () => {
    expect(DEFAULT_RULES).toEqual({
      trueSolarTime: true,
      yearBoundary: 'lunar-new-year',
      lateZiHour: 'next-day',
      sihuaSet: 'zhongzhou',
    });
  });

  it('可以逐項覆寫，其餘保持預設', () => {
    expect(resolveRules({ yearBoundary: 'lichun' })).toEqual({
      ...DEFAULT_RULES,
      yearBoundary: 'lichun',
    });
  });

  it('唔傳 overrides 唔會整污糟預設值', () => {
    const a = resolveRules();
    a.trueSolarTime = false;
    expect(DEFAULT_RULES.trueSolarTime).toBe(true);
  });
});

describe('錯誤用 result type，唔用 throw', () => {
  it('cast() 排到盤（B1–B10 落實之後）', () => {
    const r = cast(SAMPLE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.palaces).toHaveLength(12);
      expect(r.value.decadals).toHaveLength(12);
    }
  });

  it('castPartial() 冇時辰都出到年月日層', () => {
    const { time: _time, ...rest } = SAMPLE;
    const r = castPartial(rest);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.ganzhi).not.toHaveProperty('hour');
  });

  it('範圍外回 OUT_OF_RANGE，唔 throw', () => {
    expect(() => cast({ ...SAMPLE, solar: { y: 1700, m: 1, d: 1 } })).not.toThrow();
    const r = cast({ ...SAMPLE, solar: { y: 1700, m: 1, d: 1 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('OUT_OF_RANGE');
  });

  it('壞時區回 BAD_TIMEZONE，唔 throw', () => {
    const r = cast({ ...SAMPLE, tz: 'Nowhere/Nothing' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('BAD_TIMEZONE');
  });
});
