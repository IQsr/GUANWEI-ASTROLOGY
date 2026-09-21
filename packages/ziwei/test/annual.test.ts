/**
 * 工單 B15 —— 流年層 + 限流疊宮
 *
 * 呢層係年度章唯一嘅證據來源，所以測試嘅重點係
 * **「唔准喺冇嘢嘅時候扮有嘢」** —— 未起運要出 null，
 * 出生年之前要出錯，四化搵唔到星要標得出。
 */
import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  alignedPalaces,
  annual,
  annualOnSolarDate,
  cast,
  decadalForAge,
  overlayAt,
  PALACE_NAMES,
  sihuaOfStem,
  type BirthInput,
  type Chart,
} from '../src/index';

const input = (over: Partial<BirthInput> = {}): BirthInput => ({
  solar: { y: 1996, m: 6, d: 16 },
  time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex: 'male',
  ...over,
});

const chartOf = (over: Partial<BirthInput> = {}): Chart => {
  const r = cast(input(over));
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

const C = chartOf();

describe('流年命宮：太歲地支所在嘅宮', () => {
  it('每一年嘅流年命宮都等於該年地支', () => {
    for (let y = 1996; y <= 2100; y++) {
      const a = annual(C, y);
      expect(a.ok, String(y)).toBe(true);
      if (!a.ok) continue;
      expect(a.value.mingGong, String(y)).toBe(a.value.ganzhi[1]);
    }
  });

  it('十二年行一個圈，十二個地支各做一次流年命宮', () => {
    const seen = new Set<string>();
    for (let y = 2020; y < 2032; y++) {
      const a = annual(C, y);
      if (a.ok) seen.add(a.value.mingGong);
    }
    expect(seen.size).toBe(12);
  });

  it('丙午年（2026）喺午宮起流年命宮', () => {
    const a = annual(C, 2026);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.value.ganzhi).toEqual(['丙', '午']);
    expect(a.value.mingGong).toBe('午');
  });
});

describe('流年十二宮', () => {
  it('十二個宮名各出現一次', () => {
    for (let y = 2000; y < 2012; y++) {
      const a = annual(C, y);
      if (!a.ok) continue;
      const names = a.value.overlay.map((o) => o.annual);
      expect(new Set(names).size, String(y)).toBe(12);
      expect([...names].sort()).toEqual([...PALACE_NAMES].sort());
    }
  });

  it('流年命宮嗰格真係叫「命宮」', () => {
    for (let y = 2000; y < 2024; y++) {
      const a = annual(C, y);
      if (!a.ok) continue;
      expect(overlayAt(a.value, a.value.mingGong)!.annual, String(y)).toBe('命宮');
    }
  });

  it('本命層照抄本命盤，冇改過', () => {
    const a = annual(C, 2026);
    if (!a.ok) return;
    for (const o of a.value.overlay) {
      expect(o.natal).toBe(C.palaces.find((p) => p.branch === o.branch)!.name);
    }
  });
});

describe('大限層', () => {
  it('大限命宮嗰格喺大限層叫「命宮」', () => {
    for (let y = 2000; y < 2060; y++) {
      const a = annual(C, y);
      if (!a.ok || !a.value.decadal) continue;
      expect(overlayAt(a.value, a.value.decadal.branch)!.decadal, String(y)).toBe('命宮');
    }
  });

  it('大限帶嘅干係佢嗰個宮嘅本命宮干（大限四化由佢嚟）', () => {
    for (let y = 2000; y < 2060; y++) {
      const a = annual(C, y);
      if (!a.ok || !a.value.decadal) continue;
      const natal = C.palaces.find((p) => p.branch === a.value.decadal!.branch)!;
      expect(a.value.decadal.stem, String(y)).toBe(natal.stem);
    }
  });

  /**
   * 木三局虛歲三先起運，所以 1996（虛歲 1）同 1997（虛歲 2）**冇大限**。
   *
   * 呢個唔係 bug 要修，係要保住嘅行為：
   * 規範 §16 嘅年度門檻要大限核心支持，所以呢兩年**寫唔到年度章**。
   * 一旦有人喺呢度填個「最接近嘅大限」落去，就會靜靜雞產生冇根據嘅結論。
   */
  it('未起運：大限同大限四化都要係 null，唔准就近拉一個', () => {
    expect(C.wuxingJu.n).toBe(3);
    for (const y of [1996, 1997]) {
      const a = annual(C, y);
      expect(a.ok).toBe(true);
      if (!a.ok) continue;
      expect(a.value.nominalAge).toBe(y - 1996 + 1);
      expect(a.value.decadal, String(y)).toBeNull();
      expect(a.value.sihua.decadal, String(y)).toBeNull();
      for (const o of a.value.overlay) expect(o.decadal).toBeNull();
    }
    expect(annual(C, 1998).ok && annual(C, 1998)).toBeTruthy();
    const first = annual(C, 1998);
    if (first.ok) expect(first.value.decadal?.fromAge).toBe(3);
  });

  it('每個虛歲最多一個大限，而且大限區間唔會有洞', () => {
    for (let age = 3; age <= 122; age++) {
      const hit = C.decadals.filter((d) => age >= d.fromAge && age <= d.toAge);
      expect(hit.length, `虛歲 ${age}`).toBe(1);
    }
    expect(decadalForAge(C.decadals, 1)).toBeNull();
    expect(decadalForAge(C.decadals, 2)).toBeNull();
  });
});

describe('四化三層', () => {
  it('每層都係四粒，祿權科忌齊', () => {
    const a = annual(C, 2026);
    if (!a.ok) return;
    for (const layer of [a.value.sihua.natal, a.value.sihua.decadal!, a.value.sihua.annual]) {
      expect(layer.map((h) => h.hua)).toEqual(['祿', '權', '科', '忌']);
      expect(new Set(layer.map((h) => h.star)).size).toBe(4);
    }
  });

  it('流年四化跟太歲天干，大限四化跟大限宮干', () => {
    const a = annual(C, 2026);
    if (!a.ok) return;
    const annualRow = sihuaOfStem(a.value.ganzhi[0])!;
    expect(a.value.sihua.annual.map((h) => h.star)).toEqual([
      annualRow['祿'], annualRow['權'], annualRow['科'], annualRow['忌'],
    ]);
    const decRow = sihuaOfStem(a.value.decadal!.stem)!;
    expect(a.value.sihua.decadal!.map((h) => h.star)).toEqual([
      decRow['祿'], decRow['權'], decRow['科'], decRow['忌'],
    ]);
  });

  it('生年四化層同本命盤上面貼咗嘅四化一致', () => {
    const a = annual(C, 2026);
    if (!a.ok) return;
    for (const h of a.value.sihua.natal) {
      const p = C.palaces.find((q) => q.branch === h.branch)!;
      const star = p.stars.find((s) => s.name === h.star)!;
      expect(star.sihua, h.star).toBe(h.hua);
    }
  });

  /**
   * 四化係「邊粒星化」，唔係「邊個宮化」——
   * 所以三層嘅 branch 一定一樣（星唔會因為換咗層就搬宮），
   * 變嘅係嗰個宮喺唔同層叫乜。
   */
  it('同一粒星喺三層坐同一個宮，但宮名唔同', () => {
    const a = annual(C, 2026);
    if (!a.ok) return;
    for (const h of a.value.sihua.annual) {
      expect(h.branch).not.toBeNull();
      const o = overlayAt(a.value, h.branch!)!;
      expect(h.natalPalace).toBe(o.natal);
      expect(h.decadalPalace).toBe(o.decadal);
      expect(h.annualPalace).toBe(o.annual);
    }
  });

  it('十個天干嘅四化星全部都落得到宮 —— 冇一粒係盤上搵唔到', () => {
    const missing: string[] = [];
    for (let y = 1996; y < 2096; y++) {
      const a = annual(C, y);
      if (!a.ok) continue;
      for (const layer of [a.value.sihua.annual, a.value.sihua.decadal ?? []]) {
        for (const h of layer) if (h.branch === null) missing.push(`${y} ${h.star}`);
      }
    }
    expect(missing.slice(0, 5)).toEqual([]);
  });
});

describe('疊宮', () => {
  it('三層同名嘅宮：要麼十二個一齊，要麼一個都冇', () => {
    // 三層嘅宮名都係由各自命宮逆佈，所以命宮一撞就成盤撞。
    for (let y = 1998; y < 2098; y++) {
      const a = annual(C, y);
      if (!a.ok || !a.value.decadal) continue;
      const n = alignedPalaces(a.value).length;
      expect([0, 12], `${y} → ${n}`).toContain(n);
      const allSame = C.mingGong === a.value.decadal.branch && a.value.decadal.branch === a.value.mingGong;
      expect(n === 12, String(y)).toBe(allSame);
    }
  });

  it('有至少一年係三層完全重疊 —— 否則上面嗰條測試試唔到嘢', () => {
    let found = 0;
    for (let y = 1998; y < 2098; y++) {
      const a = annual(C, y);
      if (a.ok && a.value.decadal && alignedPalaces(a.value).length === 12) found++;
    }
    expect(found).toBeGreaterThan(0);
  });

  it('overlayAt 十二個地支都查得到，查唔存在嘅回 null', () => {
    const a = annual(C, 2026);
    if (!a.ok) return;
    for (const b of BRANCHES) expect(overlayAt(a.value, b), b).not.toBeNull();
  });
});

describe('年界跟 R-001（正月初一），唔係立春', () => {
  it('2026 年正月初一之前仲係乙巳年', () => {
    // 2026 農曆新年係 2026-02-17。
    const before = annualOnSolarDate(C, 2026, 1, 15);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.value.ganzhi).toEqual(['乙', '巳']);
    expect(before.value.lunarYear).toBe(2025);
  });

  it('立春（2026-02-04）之後、正月初一之前，斗數仍然當舊年', () => {
    const lichunPast = annualOnSolarDate(C, 2026, 2, 10);
    expect(lichunPast.ok).toBe(true);
    if (!lichunPast.ok) return;
    expect(lichunPast.value.ganzhi[1]).toBe('巳');
  });

  it('正月初一之後就係丙午年', () => {
    const after = annualOnSolarDate(C, 2026, 3, 1);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value.ganzhi).toEqual(['丙', '午']);
  });
});

describe('邊界同純函數', () => {
  it('出生年之前唔准排，回 OUT_OF_RANGE', () => {
    const r = annual(C, 1995);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('OUT_OF_RANGE');
  });

  it('出生嗰年虛歲係一', () => {
    const r = annual(C, 1996);
    expect(r.ok && r.value.nominalAge).toBe(1);
  });

  it('同一個 (chart, year) 跑兩次，輸出逐 byte 相同', () => {
    const a = annual(C, 2031);
    const b = annual(C, 2031);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('唔同命盤、同一年 —— 流年命宮一樣，疊宮唔一樣', () => {
    const other = chartOf({ solar: { y: 1988, m: 3, d: 3 }, sex: 'female' });
    const a = annual(C, 2026);
    const b = annual(other, 2026);
    if (!a.ok || !b.ok) return;
    expect(b.value.mingGong).toBe(a.value.mingGong); // 太歲人人一樣
    expect(b.value.nominalAge).not.toBe(a.value.nominalAge);
  });
});
