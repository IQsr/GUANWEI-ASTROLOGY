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
