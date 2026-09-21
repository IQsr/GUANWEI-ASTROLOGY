import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import oracle from './fixtures/lunar-oracle.json';
import {
  TABLES_CHECKSUM,
  TABLES_DIVERGENCE,
  equationOfTimeMinutes,
  lunarFromSolarDate,
  resolveBirthMoment,
  resolveMoment,
  solarTimeCorrection,
  termLocalDate,
  termName,
  termsInYear,
  tzOffsetMinutes,
  type BirthInput,
} from '../src/index';

const TABLES_PATH = fileURLToPath(new URL('../src/calendar/tables.json', import.meta.url));

describe('曆法表', () => {
  it('checksum 對得上 —— 表係地基，唔可以靜靜雞變', () => {
    const actual = createHash('sha256').update(readFileSync(TABLES_PATH)).digest('hex');
    expect(actual).toBe(TABLES_CHECKSUM);
  });

  it('分歧記錄齊全：公佈表覆蓋 2 年、計算仲裁 6 年', () => {
    expect(TABLES_DIVERGENCE.publishedWins).toHaveLength(2);
    expect(TABLES_DIVERGENCE.computedTiebreak).toHaveLength(6);
  });
});

describe('農曆對照兩個獨立公佈表', () => {
  it(`${oracle.cases.length} 個 case 全對`, () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const [y, m, d] = c.solar as [number, number, number];
      const r = lunarFromSolarDate(y, m, d);
      if (!r.ok) {
        bad.push(`${y}-${m}-${d} → ${r.code}`);
        continue;
      }
      const got = [r.value.y, r.value.m, r.value.d, r.value.isLeapMonth];
      if (JSON.stringify(got) !== JSON.stringify(c.lunar)) {
        bad.push(`${y}-${m}-${d} 得 ${JSON.stringify(got)} 應為 ${JSON.stringify(c.lunar)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('範圍外唔會 throw，回 OUT_OF_RANGE', () => {
    expect(() => lunarFromSolarDate(1899, 1, 1)).not.toThrow();
    const r = lunarFromSolarDate(1899, 1, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('OUT_OF_RANGE');
  });
});

describe('節氣', () => {
  const known: Array<[string, number, string]> = [
    ['冬至', 1900, '1900-12-22'],
    ['立春', 1950, '1950-02-04'],
    ['立春', 2000, '2000-02-04'],
    ['秋分', 2024, '2024-09-22'],
    ['冬至', 2024, '2024-12-21'],
    ['立春', 2025, '2025-02-03'],
    ['春分', 2025, '2025-03-20'],
    ['清明', 2025, '2025-04-04'],
    ['夏至', 2025, '2025-06-21'],
    // 近午夜個案：UTC 12-21 16:34 → 中國時間已經係 12-22
    ['冬至', 2050, '2050-12-22'],
  ];

  it.each(known)('%s %d 落喺 %s', (name, year, expected) => {
    const hit = termsInYear(year).find((t) => t.name === name);
    expect(hit).toBeDefined();
    const d = termLocalDate(hit!.index)!;
    const iso = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    expect(iso).toBe(expected);
  });

  it('每年剛好 24 個節氣', () => {
    for (const y of [1901, 1950, 2000, 2025, 2099]) {
      expect(termsInYear(y)).toHaveLength(24);
    }
  });

  it('名一定喺二十四個入面，而且循環', () => {
    const names = new Set<string>();
    for (let i = 0; i < 48; i++) names.add(termName(i));
    expect(names.size).toBe(24);
    expect(termName(0)).toBe(termName(24));
  });
});

describe('真太陽時', () => {
  it('均時差極值合理（2 月中約 −14 分、11 月初約 +16 分）', () => {
    expect(equationOfTimeMinutes(2025, 2, 11)).toBeLessThan(-13);
    expect(equationOfTimeMinutes(2025, 2, 11)).toBeGreaterThan(-15.5);
    expect(equationOfTimeMinutes(2025, 11, 3)).toBeGreaterThan(15);
    expect(equationOfTimeMinutes(2025, 11, 3)).toBeLessThan(17.5);
  });

  it('香港（114.17°E，+08:00）經度校正約 −23 分鐘', () => {
    const c = solarTimeCorrection(114.1694, 480, 2025, 6, 1);
    expect(c.longitudeMinutes).toBeCloseTo(-23.3, 1);
  });

  it('倫敦夏令時（0°E，+01:00）經度校正 −60 分鐘', () => {
    const c = solarTimeCorrection(0, 60, 2025, 6, 1);
    expect(c.longitudeMinutes).toBeCloseTo(-60, 6);
  });
});

describe('時辰同早晚子時', () => {
  const base = { y: 2025, m: 6, d: 1 };
  const noCorrection = { trueSolarTime: false, lateZiHour: 'same-day' as const };

  it.each([
    [0, 30, 0, '子'],
    [1, 30, 1, '丑'],
    [7, 40, 4, '辰'],
    [12, 0, 6, '午'],
    [22, 59, 11, '亥'],
    [23, 0, 0, '子'],
  ])('%d:%d → 時辰 %d（%s）', (h, min, idx) => {
    const r = resolveMoment(base, { h, min }, 120, 480, noCorrection);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.shichen).toBe(idx);
  });

  it('23:30 next-day：日進位一日', () => {
    const r = resolveMoment(base, { h: 23, min: 30 }, 120, 480, {
      trueSolarTime: false,
      lateZiHour: 'next-day',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.dayShift).toBe(1);
      expect(r.value.solarDate).toEqual({ y: 2025, m: 6, d: 2 });
      expect(r.value.shichen).toBe(0);
    }
  });

  it('23:30 same-day：日唔進位', () => {
    const r = resolveMoment(base, { h: 23, min: 30 }, 120, 480, noCorrection);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.dayShift).toBe(0);
      expect(r.value.solarDate).toEqual({ y: 2025, m: 6, d: 1 });
    }
  });

  it('真太陽時可以退返前一日（香港 00:10 生 → 5月31日嘅晚子時 23:49）', () => {
    const on = resolveMoment(base, { h: 0, min: 10 }, 114.1694, 480, {
      trueSolarTime: true,
      lateZiHour: 'same-day',
    });
    expect(on.ok).toBe(true);
    if (on.ok) {
      expect(on.value.solarDate).toEqual({ y: 2025, m: 5, d: 31 });
      // 校正約 −21 分鐘：00:10 → 前一日 23:49，仍然係子時（23:00–01:00）
      expect(on.value.apparentMinutes).toBeGreaterThan(23 * 60 + 40);
      expect(on.value.shichen).toBe(0);
    }
  });

  it('經度唔合法回 BAD_PLACE，唔 throw', () => {
    expect(() => resolveMoment(base, { h: 1, min: 0 }, 999, 480, noCorrection)).not.toThrow();
    const r = resolveMoment(base, { h: 1, min: 0 }, 999, 480, noCorrection);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('BAD_PLACE');
  });
});

describe('時區', () => {
  it('香港全年 +480', () => {
    expect(tzOffsetMinutes('Asia/Hong_Kong', 2025, 1, 15)).toBe(480);
    expect(tzOffsetMinutes('Asia/Hong_Kong', 2025, 7, 15)).toBe(480);
  });

  it('倫敦冬令 0、夏令 +60', () => {
    expect(tzOffsetMinutes('Europe/London', 2025, 1, 15)).toBe(0);
    expect(tzOffsetMinutes('Europe/London', 2025, 7, 15)).toBe(60);
  });

  it('印度 +330（非整點時區）', () => {
    expect(tzOffsetMinutes('Asia/Kolkata', 2025, 7, 15)).toBe(330);
  });

  it('唔認得嘅時區回 null，唔 throw', () => {
    expect(() => tzOffsetMinutes('Mars/Olympus', 2025, 1, 1)).not.toThrow();
    expect(tzOffsetMinutes('Mars/Olympus', 2025, 1, 1)).toBeNull();
  });
});

describe('resolveBirthMoment', () => {
  const input: BirthInput = {
    solar: { y: 1998, m: 3, d: 12 },
    time: { h: 7, min: 40 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.1694, lat: 22.3193, label: '香港' },
    sex: 'male',
  };

  it('解到農曆同時辰', () => {
    const r = resolveBirthMoment(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.tzOffsetMinutes).toBe(480);
    expect(r.value.moment.shichen).toBe(4); // 辰時
    expect(r.value.lunar.y).toBe(1998);
    expect(r.value.lunar.isLeapMonth).toBe(false);
  });

  it('同一個 input 跑一百次，輸出完全相同', () => {
    const first = JSON.stringify(resolveBirthMoment(input));
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(resolveBirthMoment(input))).toBe(first);
    }
  });

  it('壞時區回 BAD_TIMEZONE，唔 throw', () => {
    const r = resolveBirthMoment({ ...input, tz: 'Nowhere/Nothing' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('BAD_TIMEZONE');
  });

  it('1900 年前回 OUT_OF_RANGE', () => {
    const r = resolveBirthMoment({ ...input, solar: { y: 1880, m: 1, d: 1 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('OUT_OF_RANGE');
  });
});
