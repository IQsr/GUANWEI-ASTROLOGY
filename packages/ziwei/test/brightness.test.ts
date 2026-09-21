import { describe, expect, it } from 'vitest';
import oracle from './fixtures/brightness-oracle.json';
import {
  BRANCHES,
  BRIGHTNESS_LEVELS,
  BRIGHTNESS_META,
  MAJOR_STARS,
  auditBrightnessTable,
  brightnessOf,
  resolvePalaces,
  type BirthInput,
} from '../src/index';

function inputFor(c: { solar: number[]; shichen: number }): BirthInput {
  const [y, m, d] = c.solar as [number, number, number];
  return {
    solar: { y, m, d },
    time: { h: (c.shichen * 2) % 24, min: 0 },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: 'male',
    options: { trueSolarTime: false },
  };
}

describe('廟旺表', () => {
  it('七檔，由強到弱', () => {
    expect(BRIGHTNESS_LEVELS).toEqual(['廟', '旺', '得', '利', '平', '不', '陷']);
  });

  it('十四主星 × 十二宮 全部填滿，冇非法值', () => {
    const { missing, invalid } = auditBrightnessTable();
    expect(missing).toEqual([]);
    expect(invalid).toEqual([]);
  });

  it('每粒主星喺每個宮都查得到', () => {
    for (const s of MAJOR_STARS) {
      for (const b of BRANCHES) {
        expect(brightnessOf(s, b)).not.toBeNull();
      }
    }
  });

  it('公認事實抽查', () => {
    // 紫微午宮入廟（極向離明）
    expect(brightnessOf('紫微', '午')).toBe('廟');
    // 太陽卯宮入廟（日出扶桑）
    expect(brightnessOf('太陽', '卯')).toBe('廟');
    // 太陽亥子落陷
    expect(brightnessOf('太陽', '亥')).toBe('陷');
    expect(brightnessOf('太陽', '子')).toBe('陷');
    // 太陰亥子入廟
    expect(brightnessOf('太陰', '亥')).toBe('廟');
    expect(brightnessOf('太陰', '子')).toBe('廟');
  });

  it('出處同核實狀態有記錄；而家係兩個實作核過，但仲未有文本出處', () => {
    expect(BRIGHTNESS_META.sources.length).toBe(2); // iztro + 文墨天機
    // 呢一行係特登嘅防盜鈴。'two-implementations' 嘅意思係：
    // 兩個獨立軟件逐格核過（167/168 一致），但**兩個都唔係書**。
    // 要升做 'verified' 一定要有文本出處（工單 B5），改嗰陣呢度會爆，
    // 提你順手 bump ENGINE_VERSION 同更新 docs/rules.md。
    expect(BRIGHTNESS_META.verification).toBe('two-implementations');
  });
});

describe(`對照 iztro（${oracle.cases.length} 個）`, () => {
  it('主星 + 廟旺全對', () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) {
        bad.push(`${c.solar.join('-')} → ${r.code}`);
        continue;
      }
      const mine = r.value.layout.palaces
        .slice(2)
        .concat(r.value.layout.palaces.slice(0, 2))
        .map((p) =>
          p.stars
            .filter((s) => s.kind === 'major')
            .map((s) => `${s.name}${s.brightness ?? ''}`)
            .join('·'),
        );
      const theirs = c.stars as string[];
      for (let i = 0; i < 12; i++) {
        if (mine[i] !== theirs[i]) {
          bad.push(`${c.solar.join('-')} 時辰${c.shichen} 第${i + 1}格 得「${mine[i]}」應「${theirs[i]}」`);
          break;
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('每粒主星都有廟旺，冇一粒係 undefined', () => {
    for (const c of oracle.cases.slice(0, 100)) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) continue;
      for (const p of r.value.layout.palaces) {
        for (const s of p.stars.filter((x) => x.kind === 'major')) {
          expect(s.brightness).toBeDefined();
        }
      }
    }
  });
});
