import { expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { isSchoolReader, isYouthReader, youthPass, adultOf } from '../src/youth';
import { withPalaceAdvice } from '../src/palace-advice';
import { palaceReading } from '../src/palace-reader';

const chartOf = (y: number) => {
  const r = cast({ solar: { y, m: 8, d: 20 }, time: { h: 15, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
  if (!r.ok) throw Error(r.message);
  return r.value;
};
const SCHOOL = /零用錢|老師|班級|功課|請大人|家人或照顧者|學習用品|活動經費/;

it('splits school readers (虛歲 ≤ 18) from young adults (19–24)', () => {
  expect(isSchoolReader(chartOf(2010), 2026)).toBe(true);
  expect(isSchoolReader(chartOf(2004), 2026)).toBe(false);
  expect(isYouthReader(chartOf(2004), 2026)).toBe(true);
});

it('young adults get adult advice with ageBands; school readers and the baseline keep school advice', () => {
  const PALACES = ['兄弟', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '父母'];
  const advice = (y: number, ageBands: boolean) => PALACES.map((p) => withPalaceAdvice(chartOf(y), p, 2026, palaceReading(chartOf(y), p, 2026) ?? [], { focused: true, ageBands }).at(-1)?.text ?? '').join('');
  expect(advice(2004, true)).not.toMatch(SCHOOL);
  expect(advice(2004, false)).toMatch(SCHOOL);
  expect(advice(2010, true)).toMatch(SCHOOL);
});

it('period work wording follows the band, and adultOf maps both back', () => {
  const ch = [{ slug: '這十年', segments: [{ slot: '工作', text: '工作上，你的想法容易被採納。' }] }];
  expect(youthPass(ch)[0]!.segments[0]!.text).toBe('讀書和打工上，你的想法容易被採納。');
  expect(youthPass(ch, { school: false })[0]!.segments[0]!.text).toBe('讀書和工作上，你的想法容易被採納。');
  expect(adultOf('讀書和工作上，你的想法容易被採納。')).toBe('工作上，你的想法容易被採納。');
});
