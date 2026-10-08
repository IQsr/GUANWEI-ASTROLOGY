import { describe, expect, it } from 'vitest';
import { Converter } from 'opencc-js/t2cn';
import { cast, BRANCHES, STEMS } from '@guanwei/ziwei';
import { chartLayers } from '@/lib/layers.server';
import { PLACES } from '@/lib/luokuan';
import { HANS_ZI, zi } from '@/lib/hans-zi';
import { deepHans, hans, zhFor } from '@/lib/hans';

/** 簡體中文（2026-10-08） */
describe('hans：server 轉換', () => {
  it('字形對：著重→着重、著作照留、乾坤照留', () => {
    expect(hans('這一年裡，著重、著作、乾坤、乾淨、僕役宮')).toBe('这一年里，着重、著作、乾坤、干净、仆役宫');
  });

  it('OpenCC 之後嘅修正：藉做動詞寫借、慰藉照留；萬鍾寫钟', () => {
    expect(hans('你容易藉交際應酬')).toBe('你容易借交际应酬');
    expect(hans('一點慰藉、杯盤狼藉')).toBe('一点慰藉、杯盘狼藉');
    expect(hans('高食萬鍾')).toBe('高食万钟');
    /* 品牌名全站一律「星敘」 */
    expect(hans('示範命書 · 星敘')).toBe('示范命书 · 星敘');
  });

  it('簡體再轉唔變（讀者用簡體打嘅名照舊）', () => {
    const s = hans('紫微斗數·命書');
    expect(hans(s)).toBe(s);
  });

  it('zhFor 只轉簡體頁；deepHans 連物件入面嘅字串都轉，keep 嘅鍵唔郁', () => {
    expect(zhFor('zh-Hant', '命宮')).toBe('命宮');
    expect(zhFor('en', '命宮')).toBe('命宮');
    expect(zhFor('zh-Hans', '命宮')).toBe('命宫');
    expect(deepHans({ slug: '命宮', title: '命宮', n: 1, a: ['財帛'] }, new Set(['slug']))).toEqual({ slug: '命宮', title: '命宫', n: 1, a: ['财帛'] });
  });
});

describe('hans-zi：命盤詞彙逐字表齊唔齊', () => {
  it('隨機排盤，每個星名、宮名、廟旺、四化、干支、地點逐字換都同 OpenCC 整句一樣', () => {
    const c = Converter({ from: 'tw', to: 'cn' });
    const words = new Set<string>(['身', ...BRANCHES, ...STEMS, ...PLACES.map((p) => p.label)]);
    for (let i = 0; i < 300; i++) {
      const r = cast({ solar: { y: 1950 + (i % 60), m: 1 + (i % 12), d: 1 + (i % 28) }, time: { h: (i * 5) % 24, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114, lat: 22, label: 'x' }, sex: i % 2 ? 'male' : 'female' });
      if (!r.ok) continue;
      for (const p of r.value.palaces) {
        words.add(p.name);
        for (const s of p.stars) [s.name, s.brightness, s.sihua].forEach((w) => w && words.add(w));
      }
      const L = chartLayers(r.value, 2026);
      if (L) {
        words.add(L.ganzhi);
        for (const l of [L.decadal, L.annual]) if (l) Object.values(l.names).forEach((n) => n && words.add(n));
      }
    }
    const wrong = [...words].filter((w) => zi(w, true) !== c(w)).map((w) => `${w}→${zi(w, true)}（應該係 ${c(w)}）`);
    expect(wrong).toEqual([]);
    expect(Object.keys(HANS_ZI).length).toBeGreaterThan(10);
    expect(zi('命宮', false)).toBe('命宮');
  });
});
