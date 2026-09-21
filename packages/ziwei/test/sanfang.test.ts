/**
 * 工單 B14 —— 三方四正同空宮借星
 *
 * 純結構層，所以測試都係純結構：唔核任何吉凶，只核幾何關係同借星判定。
 */
import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  borrowedMajors,
  cast,
  isEmptyPalace,
  oppositeBranch,
  sanFangBranches,
  sanFangPalaces,
  sanFangSiZheng,
  type BirthInput,
  type Branch,
} from '../src/index';

const input = (over: Partial<BirthInput> = {}): BirthInput => ({
  solar: { y: 1996, m: 6, d: 16 },
  time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex: 'male',
  ...over,
});

describe('三方四正（幾何）', () => {
  it('十二宮每一個都回四個唔同嘅宮', () => {
    for (const b of BRANCHES) {
      const four = sanFangBranches(b);
      expect(four, b).toHaveLength(4);
      expect(new Set(four).size, b).toBe(4);
      expect(four[0], b).toBe(b);
    }
  });

  it('對宮係正沖：相隔六位', () => {
    for (let i = 0; i < 12; i++) {
      const b = BRANCHES[i]!;
      expect(oppositeBranch(b)).toBe(BRANCHES[(i + 6) % 12]);
      // 對宮嘅對宮 = 自己
      expect(oppositeBranch(oppositeBranch(b))).toBe(b);
    }
  });

  it('三合宮同本宮相隔四位，三個一組', () => {
    for (const b of BRANCHES) {
      const { ben, sanheA, sanheB } = sanFangSiZheng(b);
      const i = BRANCHES.indexOf(ben);
      expect(sanheA).toBe(BRANCHES[(i + 4) % 12]);
      expect(sanheB).toBe(BRANCHES[(i + 8) % 12]);
      // 三合係封閉嘅：A 嘅三合包返本宮
      expect(sanFangBranches(sanheA)).toContain(ben);
    }
  });

  it('三方四正係對稱關係 —— 我睇到你，你就睇到我', () => {
    for (const b of BRANCHES) {
      for (const other of sanFangBranches(b)) {
        expect(sanFangBranches(other), `${b} ↔ ${other}`).toContain(b);
      }
    }
  });

  it('申子辰、寅午戌、巳酉丑、亥卯未 —— 四組三合啱返', () => {
    const groups: Branch[][] = [
      ['申', '子', '辰'],
      ['寅', '午', '戌'],
      ['巳', '酉', '丑'],
      ['亥', '卯', '未'],
    ];
    for (const g of groups) {
      for (const b of g) {
        const { ben, sanheA, sanheB } = sanFangSiZheng(b);
        expect(new Set([ben, sanheA, sanheB]), b).toEqual(new Set(g));
      }
    }
  });
});

describe('空宮借星', () => {
  it('空宮 = 冇主星。輔星煞星唔計', () => {
    const r = cast(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    for (const p of r.value.palaces) {
      const hasMajor = p.stars.some((s) => s.kind === 'major');
      expect(isEmptyPalace(p), `${p.branch} 有 ${p.stars.length} 粒星`).toBe(!hasMajor);
      // 一個得輔星嘅宮仍然係空宮
      if (!hasMajor && p.stars.length > 0) {
        expect(p.stars.every((s) => s.kind === 'aux')).toBe(true);
      }
    }
  });

  it('空宮先有 borrowsFrom，而且一定係對宮', () => {
    const r = cast(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    for (const p of r.value.palaces) {
      if (isEmptyPalace(p)) {
        expect(p.borrowsFrom, `${p.branch} 係空宮`).toBe(oppositeBranch(p.branch));
      } else {
        expect(p.borrowsFrom, `${p.branch} 有主星`).toBeUndefined();
      }
    }
  });

  it('借到嘅一定係主星，唔會借輔星', () => {
    const r = cast(input());
    if (!r.ok) return;
    for (const p of r.value.palaces) {
      const got = borrowedMajors(r.value.palaces, p.branch);
      if (!isEmptyPalace(p)) {
        // 唔係空宮就回 null —— 唔係空 array
        expect(got, p.branch).toBeNull();
      } else {
        expect(got, p.branch).not.toBeNull();
        expect(got!.every((s) => s.kind === 'major')).toBe(true);
      }
    }
  });

  /**
   * 空宮數目只有三個可能值：0、2、4。
   *
   * 十四主星由紫微同天府兩系推出，而兩系鏡對於寅申軸，
   * 所以佔到嘅宮位數只可能係 8、10 或者 12：
   *
   *   紫微在寅／申 → 佔 12 宮 → **零空宮**
   *   紫微在巳／亥 → 佔  8 宮 → 四空宮
   *   其餘八個位置 → 佔 10 宮 → 兩空宮
   *
   * 所以「冇空宮」唔係 bug，係紫微在寅申。
   * 而空宮數目永遠係雙數 —— 呢個就係嗰條對稱軸嘅直接後果。
   */
  it('空宮數目只可能係 0、2、4，而且永遠雙數', () => {
    const seen = new Set<number>();
    const bad: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const y = 1900 + (i % 201);
      const m = (i % 12) + 1;
      const d = (i % 28) + 1;
      const r = cast(input({ solar: { y, m, d }, time: { h: i % 24, min: 0 } }));
      if (!r.ok) continue;
      const empty = r.value.palaces.filter(isEmptyPalace);
      seen.add(empty.length);
      if (![0, 2, 4].includes(empty.length)) {
        bad.push(`${y}-${m}-${d}：${empty.length} 個空宮`);
      }
      for (const p of empty) {
        if (p.borrowsFrom !== oppositeBranch(p.branch)) {
          bad.push(`${y}-${m}-${d} ${p.branch}：借咗 ${p.borrowsFrom}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // 一千個盤入面三種情況都要出現過，否則呢條測試其實冇試到嘢
    expect([...seen].sort()).toEqual([0, 2, 4]);
  });

  it('紫微在寅或者申 → 零空宮；在巳或者亥 → 四空宮', () => {
    const bad: string[] = [];
    for (let i = 0; i < 600; i++) {
      const y = 1950 + (i % 101);
      const r = cast(input({ solar: { y, m: (i % 12) + 1, d: (i % 28) + 1 }, time: { h: i % 24, min: 0 } }));
      if (!r.ok) continue;
      const zi = r.value.palaces.find((p) => p.stars.some((s) => s.name === '紫微'))!;
      const n = r.value.palaces.filter(isEmptyPalace).length;
      const want = ['寅', '申'].includes(zi.branch) ? 0 : ['巳', '亥'].includes(zi.branch) ? 4 : 2;
      if (n !== want) bad.push(`紫微${zi.branch}：${n} 個空宮（應該 ${want}）`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('sanFangPalaces', () => {
  it('回四個宮位物件，次序同 sanFangBranches 一致', () => {
    const r = cast(input());
    if (!r.ok) return;
    const ming = r.value.mingGong;
    const got = sanFangPalaces(r.value.palaces, ming);
    expect(got.map((p) => p.branch)).toEqual(sanFangBranches(ming));
  });

  it('命宮嘅三方四正 = 命、財帛、遷移、官祿', () => {
    const r = cast(input());
    if (!r.ok) return;
    const names = sanFangPalaces(r.value.palaces, r.value.mingGong).map((p) => p.name);
    expect(new Set(names)).toEqual(new Set(['命宮', '財帛', '遷移', '官祿']));
  });

  it('夫妻宮嘅三方四正 = 夫妻、遷移、官祿、福德', () => {
    const r = cast(input());
    if (!r.ok) return;
    const fuqi = r.value.palaces.find((p) => p.name === '夫妻')!;
    const names = sanFangPalaces(r.value.palaces, fuqi.branch).map((p) => p.name);
    expect(new Set(names)).toEqual(new Set(['夫妻', '遷移', '官祿', '福德']));
  });
});
