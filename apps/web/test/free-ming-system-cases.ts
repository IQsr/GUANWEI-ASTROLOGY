import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { xingxiOf } from '@guanwei/content';

export type ReadingCase = { n: number; name: string; borrowed: boolean; input: BirthInput; seed: string; chart: Chart };
let memo: ReadingCase[] | undefined;
/** 固定種子找實際可排出的60組實坐及借星例子；資料均為合成，並非用戶生辰。 */
export function readingCases(): ReadingCase[] {
  if (memo) return memo;
  const native = new Map<number, ReadingCase>();
  const borrowed = new Map<number, ReadingCase>();
  let random = 22026022;
  const rnd = (n: number) => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return Math.floor(random / 4294967296 * n); };
  for (let i = 0; i < 3000; i++) {
    const input: BirthInput = { solar: { y: 1950 + rnd(65), m: 1 + rnd(12), d: 1 + rnd(28) },
      time: { h: rnd(24), min: rnd(60) }, sex: i % 2 ? 'male' : 'female', tz: 'Asia/Hong_Kong',
      place: { lng: 114.17, lat: 22.32, label: '香港' } };
    const r = cast(input); if (!r.ok) continue;
    const x = xingxiOf(r.value); if (!x) continue;
    const target = x.borrowed ? borrowed : native;
    if (!target.has(x.system.n)) target.set(x.system.n, { n: x.system.n, name: x.system.name, borrowed: x.borrowed,
      input, chart: r.value, seed: `free-ming-system-${x.system.n}-${x.borrowed ? 'borrowed' : 'natal'}` });
  }
  memo = [...native.values(), ...borrowed.values()].sort((a, b) => Number(a.borrowed) - Number(b.borrowed) || a.n - b.n);
  return memo;
}
