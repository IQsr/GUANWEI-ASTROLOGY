import { expect, it } from 'vitest';
import { isRelocatableHedge, withRelocatedHedges } from '../src/hedge-relocate';
import type { MingStatement } from '../src/ming-writer';

const line = (text: string, citations: string[] = [], kind: MingStatement['kind'] = 'interpretation'): MingStatement => ({ text, en: '', kind, source_ids: ['x'], citations });
const seg = (...statements: MingStatement[]): { slot: string; text: string; statements: MingStatement[]; referenceConditions?: string[] } => ({ slot: "結論", text: statements.map((l) => l.text).join(""), statements });

it('moves unresolved branch and editor-note sentences, keeps concrete advice and negations', () => {
  expect(isRelocatableHedge('原書把營運與守財分開，亦有化忌帶來收斂的修飾。')).toBe(true);
  expect(isRelocatableHedge('這是閱讀方法，不是另一條命理判斷。', 'editorial-advice')).toBe(true);
  expect(isRelocatableHedge('你可以把收入和開支分開記下。', 'editorial-advice')).toBe(false);
  expect(isRelocatableHedge('把日常要用的錢分開。', 'editorial-advice')).toBe(false);
  expect(isRelocatableHedge('能言善辯不等於一定爭吵。')).toBe(false);
});

it('keeps the sentence in the reference conditions and the citation on the paragraph', () => {
  const [out] = withRelocatedHedges([seg(line('你的財帛宮在戌，貪狼坐守。原書把營運與守財分開。', ['c1']), line('要留意收入怎樣依賴開拓。', [], 'editorial-advice'))]);
  expect(out!.text).toBe('你的財帛宮在戌，貪狼坐守。要留意收入怎樣依賴開拓。');
  expect(out!.referenceConditions).toEqual(['原書把營運與守財分開。']);
  expect(out!.statements!.flatMap((l) => l.citations)).toEqual(['c1']);
});

it('moves a dependent sentence with it and folds an emptied paragraph into the previous cited one', () => {
  const rows = withRelocatedHedges([
    seg(line('甲宮坐紫微。', ['c1'])),
    seg(line('火星與擎羊各有不同落點。', ['c2']), line('這幾種配合讓取象各自展開。', ['c3'])),
  ]);
  expect(rows).toHaveLength(1);
  expect(rows[0]!.statements![0]!.citations).toEqual(['c1', 'c2', 'c3']);
  expect(rows[0]!.referenceConditions).toEqual(['火星與擎羊各有不同落點。', '這幾種配合讓取象各自展開。']);
});

it('leaves untouched paragraphs identical', () => {
  const plain = seg(line('你的父母宮在子，紫微坐守。', ['c1']));
  expect(withRelocatedHedges([plain])[0]).toBe(plain);
});
