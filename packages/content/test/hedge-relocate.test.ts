import { expect, it } from 'vitest';
import { isEditorNote, isRelocatableHedge, withRelocatedHedges } from '../src/hedge-relocate';
import type { MingStatement } from '../src/ming-writer';

const line = (text: string, citations: string[] = [], kind: MingStatement['kind'] = 'interpretation'): MingStatement => ({ text, en: '', kind, source_ids: ['x'], citations });
const seg = (...statements: MingStatement[]): { slot: string; text: string; statements: MingStatement[]; referenceConditions?: string[] } => ({ slot: "結論", text: statements.map((l) => l.text).join(""), statements });

it('moves unresolved branch and editor-note sentences, keeps concrete advice and negations', () => {
  expect(isRelocatableHedge('原書把營運與守財分開，亦有化忌帶來收斂的修飾。')).toBe(true);
  expect(isRelocatableHedge('這是閱讀方法，不是另一條命理判斷。', 'editorial-advice')).toBe(true);
  expect(isRelocatableHedge('你可以把收入和開支分開記下。', 'editorial-advice')).toBe(false);
  expect(isRelocatableHedge('把日常要用的錢分開。', 'editorial-advice')).toBe(false);
  expect(isRelocatableHedge('能言善辯不等於一定爭吵。')).toBe(false);
  expect(isRelocatableHedge('太陽的光度是一層，實際有沒有成對輔佐與吉化支持又是另一層，不能只按寅申就定本質。')).toBe(true);
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

it('never moves a verdict sentence', () => {
  const verdict: MingStatement = { text: '你們兩人宜各有自己的事業，各自獨立最好。', en: '', kind: 'interpretation', source_ids: ['plain.天梁.夫妻'], citations: ['c1'] };
  const s = seg(verdict);
  expect(withRelocatedHedges([s])[0]).toBe(s);
});

it('v3 drops editor notes outright, keeps explicit book statements and advice', () => {
  expect(isEditorNote('原書的智力、性傾向與疾病說法未作個人判斷。')).toBe(true);
  expect(isEditorNote('這些先列作盤面位置資料，未用顆數決定偏向，也沒有把借入星曜重複計入。')).toBe(true);
  expect(isEditorNote('本章不推健康、親屬或人生事件。')).toBe(true);
  expect(isEditorNote('化祿較重物質、化忌另有無謂奔忙的修飾。')).toBe(true);
  expect(isEditorNote('七殺獨坐，原書明說不能只由七殺就斷在外日多，仍須火鈴同度或祿馬等配合。')).toBe(true);
  expect(isEditorNote('紫微獨坐，原書明說財源充裕未必就能積聚。')).toBe(false);
  expect(isEditorNote('你和後輩之間話說得通，關係少有隔閡。')).toBe(false);
  expect(isEditorNote('你的朋友誠懇樸實，也肯直言規勸你。')).toBe(false);
  expect(isEditorNote('答應一起做的事另行確認。', 'editorial-advice')).toBe(false);
});

it('v3 cuts editor notes without adding them to the reference conditions', () => {
  const [out] = withRelocatedHedges([seg(line('你的福德宮在午。原書的智力、性傾向與疾病說法未作個人判斷。', ['c1']))], { editorNotes: true });
  expect(out!.text).toBe('你的福德宮在午。');
  expect(out!.referenceConditions).toBeUndefined();
  expect(out!.statements![0]!.citations).toEqual(['c1']);
});

it('v3 drops 火鈴 sentences only when the palace group has neither star', () => {
  const s = seg(line('你的夫妻宮在未。原書另在火鈴同度時提醒感情始熱終冷。', ['c1']));
  expect(withRelocatedHedges([s], { editorNotes: true, absent: { fireBell: true } })[0]!.text).toBe('你的夫妻宮在未。');
  expect(withRelocatedHedges([s], { editorNotes: true, absent: { fireBell: false } })[0]!.text).toBe(s.text);
  expect(withRelocatedHedges([s])[0]).toBe(s);
});

it('v3 strips an editor tail and keeps the sentence', () => {
  const [out] = withRelocatedHedges([seg(line('留意開拓之後有沒有可交接、維持的流程，這屬編輯例子。', ['c1']))], { editorNotes: true });
  expect(out!.text).toBe('留意開拓之後有沒有可交接、維持的流程。');
});
