import { describe, expect, it } from 'vitest';
import { resolveBirthMoment } from '@guanwei/ziwei';
import { PLACES } from '@/lib/luokuan';
import { slotName as nameOf, slotsOfDay, slotSummary as summaryOf, type Resolve, type ShichenWords } from '@/lib/slots';
import zh from '../messages/zh-Hant.json';

/** 中文字由 messages 嚟 —— 測嘅就係讀者見到嘅字。 */
const W: ShichenWords = {
  branch: zh.shichen.branch,
  hour: (branch) => zh.shichen.hour.replace('{branch}', branch),
  earlyZi: zh.shichen.earlyZi,
  lateZi: zh.shichen.lateZi,
  prevZi: zh.shichen.prevZi,
};
const slotName = (s: Parameters<typeof nameOf>[0]) => nameOf(s, W);
const slotSummary = (s: Parameters<typeof summaryOf>[0]) => summaryOf(s, W);

/**
 * 時辰選項（落款第四步）：每一格啱啱好係一個時辰，鐘面時間跟真太陽時。
 *
 * 呢度用真引擎（同 `lib/slots.server.ts` 同一條路），唔係假嘅 —— 要守住嘅就係
 * 「畫面話係未時，排盤就一定係未時」。
 */

function engineFor(date: string, placeIndex: number): Resolve {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const place = PLACES[placeIndex]!;
  return (minute) => {
    const r = resolveBirthMoment({
      solar: { y, m, d },
      time: { h: Math.floor(minute / 60), min: minute % 60 },
      tz: place.tz,
      place: { lng: place.lng, lat: place.lat, label: place.label },
      sex: 'male',
    });
    return r.ok ? { shichen: r.value.moment.shichen, dayIndex: r.value.moment.dayIndex } : null;
  };
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe.each([
  ['香港 1998-03-12', '1998-03-12', 0],
  ['倫敦夏天（夏令時）2001-07-20', '2001-07-20', 4],
  ['紐約冬天 1985-12-01', '1985-12-01', 5],
])('%s', (_label, date, placeIndex) => {
  const resolve = engineFor(date, placeIndex);
  const slots = slotsOfDay(resolve)!;

  it('一日由 00:00 鋪到 23:59，冇窿冇重疊', () => {
    expect(slots[0]!.from).toBe('00:00');
    expect(slots.at(-1)!.to).toBe('23:59');
    for (let i = 1; i < slots.length; i++) expect(toMin(slots[i]!.from)).toBe(toMin(slots[i - 1]!.to) + 1);
  });

  it('十二個時辰全部都有', () => {
    expect(new Set(slots.map((s) => s.shichen)).size).toBe(12);
  });

  /** 最要緊嗰條：揀一格，用嗰格嘅 pick 排盤，一定落返嗰個時辰、嗰一日。 */
  it('每格嘅 pick 排出嚟就係嗰格', () => {
    for (const s of slots) {
      expect(resolve(toMin(s.pick)), slotSummary(s)).toEqual({ shichen: s.shichen, dayIndex: s.dayIndex });
    }
  });

  /** 格頭同格尾都要屬嗰格；前一分鐘同後一分鐘唔屬 —— 顯示嘅邊界就係真嘅邊界。 */
  it('鐘面時間嘅邊界就係時辰嘅邊界', () => {
    for (const s of slots) {
      const from = toMin(s.from);
      const to = toMin(s.to);
      expect(resolve(from)).toEqual({ shichen: s.shichen, dayIndex: s.dayIndex });
      expect(resolve(to)).toEqual({ shichen: s.shichen, dayIndex: s.dayIndex });
      if (from > 0) expect(resolve(from - 1)).not.toEqual({ shichen: s.shichen, dayIndex: s.dayIndex });
      if (to < 1439) expect(resolve(to + 1)).not.toEqual({ shichen: s.shichen, dayIndex: s.dayIndex });
    }
  });
});

describe('香港：真太陽時慢過鐘面', () => {
  const slots = slotsOfDay(engineFor('1998-03-12', 0))!;

  /** 香港經度 −23 分鐘，三月均時差約 −10 分鐘：未時由鐘面 13:30 幾開始，唔係 13:00。 */
  it('未時唔係由 13:00 開始，係遲咗半個鐘左右', () => {
    const wei = slots.find((s) => s.shichen === 7)!;
    expect(toMin(wei.from)).toBeGreaterThan(13 * 60 + 20);
    expect(toMin(wei.from)).toBeLessThan(13 * 60 + 45);
  });

  /**
   * 2026-10-06 起晚子時屬當日（中州派《初級講義》「交入十二時(零時)，才是一天新的開始」，R-002）。
   * 香港真太陽時慢過鐘面，所以凌晨頭二十幾分鐘仲係前一晚嘅子時 —— 一日十四格：
   *   子時（前夜）、早子時、丑…亥、夜子時（屬當日）
   */
  it('十四格：前夜子時、早子時、夜子時（屬當日）', () => {
    expect(slots).toHaveLength(14);
    expect(slots[0]!.shichen).toBe(0);
    expect(slots[0]!.dayOffset).toBe(-1);
    expect(slotName(slots[0]!)).toBe('子時（前夜）');
    expect(slots[1]!.shichen).toBe(0);
    expect(slots[1]!.dayOffset).toBe(0);
    expect(slotName(slots[1]!)).toBe('早子時');
    expect(slots.at(-1)!.shichen).toBe(0);
    expect(slots.at(-1)!.dayOffset).toBe(0);
    expect(slotName(slots.at(-1)!)).toBe('夜子時');
  });
});

describe('分組（假 resolver）', () => {
  it('任何一分鐘解唔到 → null，唔好出半張表', () => {
    expect(slotsOfDay((m) => (m === 700 ? null : { shichen: 0, dayIndex: 0 }))).toBeNull();
  });

  /** 學派設「晚子時屬當日」嗰陣，凌晨頭幾分鐘仲係前一晚嘅子時。 */
  it('凌晨頭幾分鐘屬前一日 → 寫「前夜」，正午嗰日做基準', () => {
    const slots = slotsOfDay((m) =>
      m < 20 ? { shichen: 0, dayIndex: 9 } : { shichen: Math.floor((m + 60) / 120) % 12, dayIndex: 10 },
    )!;
    expect(slotName(slots[0]!)).toBe('子時（前夜）');
    expect(slots[1]!.dayOffset).toBe(0);
  });

  it('已答嗰行寫埋鐘面時間', () => {
    expect(slotSummary({ shichen: 7, dayOffset: 0, from: '13:36', to: '15:35' })).toBe('未時 · 13:36–15:35');
  });
});
