import { it, expect } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { huaMentions, withConditionalBranches } from '../src/free-ming-systems';

// 示範盤：庚年，命宮申天同天梁，天同化忌在命宮；太陽化祿在福德戌（唔喺命宮三方四正）。
const r = cast({ solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
if (!r.ok) throw Error(r.message);
const chart = r.value;
const seg = (...texts: string[]) => ({ slot: '骨架', text: texts.join(''), statements: texts.map((text) => ({ text, en: '', kind: 'editorial-explanation' as const, source_ids: ['x'], citations: [] })) });

it('reads full and shorthand 四化 mentions, including chained ones', () => {
  expect(huaMentions('紫微化權、破軍化祿或權，並不直接等於安定；')).toEqual([{ star: '紫微', hua: '權' }, { star: '破軍', hua: '祿' }, { star: '破軍', hua: '權' }]);
  expect(huaMentions('武曲忌與貪狼忌的修飾也不相同。')).toEqual([{ star: '武曲', hua: '忌' }, { star: '貪狼', hua: '忌' }]);
  expect(huaMentions('這些配合需要合讀。')).toEqual([]);
});

it('keeps a branch only when one named 四化 is in the 命宮 三方四正, and drops its dependent sentence', () => {
  const [kept] = withConditionalBranches(chart, [seg('天同化忌須連煞曜看；', '太陽化祿另論。這些配合需要合讀。', '原書另有限制。')]);
  expect(kept!.text).toBe('天同化忌須連煞曜看。原書另有限制。');
  expect(kept!.statements.map((l) => l.text)).toEqual(['天同化忌須連煞曜看。', '原書另有限制。']);
});

it('leaves untouched segments identical and drops a segment that has nothing left', () => {
  const plain = seg('天同、天梁同宮。');
  expect(withConditionalBranches(chart, [plain])[0]).toBe(plain);
  expect(withConditionalBranches(chart, [seg('太陽化祿另論。')])).toEqual([]);
});

it('uses the reviewed rewrite when a main claim shares its sentence with a missing branch', () => {
  const [kept] = withConditionalBranches(chart, [seg('天同獨坐，原書重視相處的感情與溝通，但天同化祿另有晚輩另起爐灶的說法。')], '子女');
  expect(kept!.text).toBe('天同獨坐，原書重視相處的感情與溝通。');
});

it('rewrites or drops a sentence whose referent was dropped, and closes a dangling semicolon', () => {
  expect(withConditionalBranches(chart, [seg('原書另在財蔭夾、破軍化祿的配合中談置業或工作環境轉換。', '這些不是同一種結果，也不能只見一個禄字就認定會買樓或得到資產。')], '田宅')[0]!.text)
    .toBe('不能只見一個禄字就認定會買樓或得到資產。');
  expect(withConditionalBranches(chart, [seg('甲；', '太陽化祿另論。', '乙。')])[0]!.text).toBe('甲。乙。');
});

it('reads each palace from its own 三方四正, plus any palace a sentence names', () => {
  // 太陽化祿在福德戌：福德章保留；命宮章只在句子點名福德時保留。
  expect(withConditionalBranches(chart, [seg('太陽化祿另論。')], '福德')[0]!.text).toBe('太陽化祿另論。');
  expect(withConditionalBranches(chart, [seg('太陽化祿另論。')], '命宮')).toEqual([]);
  expect(withConditionalBranches(chart, [seg('福德的太陽化祿另論。')], '命宮')[0]!.text).toBe('福德的太陽化祿另論。');
});

it('narrows a sentence to the named 四化 that are on the chart, or drops it when no version is reviewed', () => {
  // 天同化忌在命宮；太陰化忌本盤冇。
  expect(withConditionalBranches(chart, [seg('天同化忌、太陰化忌及所會陽巨吉化各有不同作用；', '乙。')])[0]!.text)
    .toBe('天同化忌與所會陽巨吉化各有不同作用。乙。');
  expect(withConditionalBranches(chart, [seg('甲。', '天同化忌與太陰化忌另論。')])[0]!.text).toBe('甲。');
});
