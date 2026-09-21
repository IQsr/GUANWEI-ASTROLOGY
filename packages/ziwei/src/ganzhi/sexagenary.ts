import { BRANCHES, STEMS, type Branch, type Stem } from '../types';

export type Pillar = { stem: Stem; branch: Branch };

/** 六十甲子序（0 = 甲子）→ 干支。 */
export function pillarFromIndex(index: number): Pillar {
  const i = ((index % 60) + 60) % 60;
  return { stem: STEMS[i % 10]!, branch: BRANCHES[i % 12]! };
}

/** 干支 → 六十甲子序。干支唔配對（例如 甲丑）回 null。 */
export function indexFromPillar(stem: Stem, branch: Branch): number | null {
  const s = STEMS.indexOf(stem);
  const b = BRANCHES.indexOf(branch);
  if (s < 0 || b < 0) return null;
  for (let i = 0; i < 60; i++) {
    if (i % 10 === s && i % 12 === b) return i;
  }
  return null;
}

export function pillarText(p: Pillar): string {
  return `${p.stem}${p.branch}`;
}
