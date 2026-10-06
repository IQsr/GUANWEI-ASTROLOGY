/**
 * 洛陽時間（timeBasis: 'luoyang'，2026-10-06，docs/rules.md R-004）
 *
 * 王亭之《初級講義》甲、安星法（一）：
 *   「本派起出生時是以『洛陽』地區作為絕對標準，每與洛陽相差十五度經線便有一個小時之時差。
 *    香港標準時間與洛陽時間相差七分半鐘」
 *   「洛陽時間與上海時間，在現行標準時間中沒有分別，但在推算紫微斗數時，便有三十五分鐘的時差」
 *   「一九五八年西曆五月十日下午八時……因有夏令時間，應改為下午七時生人，作酉時算」
 */
import { describe, expect, it } from 'vitest';
import { resolveBirthMoment, type BirthInput } from '../src/index';

const at = (
  solar: { y: number; m: number; d: number },
  time: { h: number; min: number },
  tz: string,
  lng: number,
  timeBasis: 'birthplace' | 'luoyang' = 'luoyang',
): BirthInput => ({ solar, time, tz, place: { lng, lat: 30, label: 'x' }, sex: 'male', options: { timeBasis } });

function moment(input: BirthInput) {
  const r = resolveBirthMoment(input);
  if (!r.ok) throw new Error(r.message);
  return r.value.moment;
}

describe('洛陽時間：照講義嘅數字', () => {
  it('上海差三十五分鐘左右（經度 121.47）', () => {
    const m = moment(at({ y: 2026, m: 3, d: 10 }, { h: 12, min: 0 }, 'Asia/Shanghai', 121.47));
    expect(720 - m.apparentMinutes).toBeGreaterThanOrEqual(35);
    expect(720 - m.apparentMinutes).toBeLessThanOrEqual(37);
  });

  it('香港差七分鐘左右（經度 114.17）', () => {
    const m = moment(at({ y: 2026, m: 3, d: 10 }, { h: 12, min: 0 }, 'Asia/Hong_Kong', 114.17));
    expect(720 - m.apparentMinutes).toBeGreaterThanOrEqual(6);
    expect(720 - m.apparentMinutes).toBeLessThanOrEqual(8);
  });

  it('講義例子：香港 1958-05-10 晚上八點，有夏令時，作酉時', () => {
    const m = moment(at({ y: 1958, m: 5, d: 10 }, { h: 20, min: 0 }, 'Asia/Hong_Kong', 114.17));
    expect(m.shichen).toBe(9); /* 酉 */
  });
});

describe('洛陽時間：海外出世', () => {
  it('倫敦冬天朝早八點 → 洛陽下晝三點半左右，申時，同一日', () => {
    const m = moment(at({ y: 2026, m: 1, d: 15 }, { h: 8, min: 0 }, 'Europe/London', -0.13));
    expect(m.shichen).toBe(8); /* 申 */
    expect(m.solarDate).toEqual({ y: 2026, m: 1, d: 15 });
  });

  it('倫敦晚上八點 → 洛陽翌日凌晨三點半，寅時，日子進一日', () => {
    const m = moment(at({ y: 2026, m: 1, d: 15 }, { h: 20, min: 0 }, 'Europe/London', -0.13));
    expect(m.shichen).toBe(2); /* 寅 */
    expect(m.solarDate).toEqual({ y: 2026, m: 1, d: 16 });
  });

  it('倫敦夏天（BST）朝早八點：先減夏令時，再換洛陽 → 未時', () => {
    const m = moment(at({ y: 2026, m: 7, d: 15 }, { h: 8, min: 0 }, 'Europe/London', -0.13));
    expect(m.shichen).toBe(7); /* 未 */
  });
});

describe('預設仍然係出生地真太陽時', () => {
  it('唔揀 luoyang，倫敦朝早八點仍然係辰時', () => {
    const m = moment(at({ y: 2026, m: 1, d: 15 }, { h: 8, min: 0 }, 'Europe/London', -0.13, 'birthplace'));
    expect(m.shichen).toBe(4); /* 辰 */
  });

  it('直接揀時辰（唔係鐘面時間）就唔換算', () => {
    const r = resolveBirthMoment({ ...at({ y: 2026, m: 1, d: 15 }, { h: 8, min: 0 }, 'Europe/London', -0.13), time: { shichen: 4 } });
    expect(r.ok && r.value.moment.shichen).toBe(4);
  });
});
