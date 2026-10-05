import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { En } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 英文版十二宮章（2026-10-05）：隨機 150 張盤，十二宮章逐句譯晒、過英文檢查、章名有英文。
 * 中文改咗而翻譯表冇跟，呢個測試會列出邊句冇譯。
 */
const OPENERS = /(?:^|[.] )(The catch is that|The trade-off is that|The other side of this is that|What complicates this is that|Keep in mind that|Watch that|The risk is that) /gm;
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

describe('英文：十二宮章', () => {
  it('150 張盤，每章每句都譯到，冇漏中文，過英文檢查', () => {
    const missing = new Set<string>();
    const lint = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const solar = { y: 1950 + ((i * 7) % 60), m: 1 + ((i * 5) % 12), d: 1 + ((i * 11) % 28) };
      const r = cast({ solar, time: { h: (i * 3) % 24, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
      if (!r.ok) continue;
      const drafts = chapterDrafts(bookChapters(r.value, { seed: String(i), year: 2026, solar, place: '香港' }) ?? [], 'en-test');
      const st = En.newBookState();
      const openers: string[] = [];
      for (const d of drafts.filter((x) => PALACES.includes(x.slug))) {
        const out = En.renderChapter(d.body, st);
        for (const m of out.text.matchAll(OPENERS)) openers.push(m[1]!);
        /* 舊式（翻譯表入面嗰款）唔應該出街 —— 全部經輪換 */
        expect(out.text, d.slug).not.toMatch(/(^|[.] )(The catch: |The cost: |Keep in mind: )/);
        /* 煞星唔好得一個標籤（睇稿指南第 13 節）：六煞都有自己嘅開頭 */
        expect(out.text, d.slug).not.toMatch(/Also in this palace is |(^|[.] )And (Huo Xing|Ling Xing|Qing Yang|Tuo Luo|Di Kong|Di Jie)\b/m);
        out.missing.forEach((m) => missing.add(m));
        En.scanEnglish(out.text).forEach((c) => lint.add(`${c}：${d.slug}`));
        expect(En.chapterTitleEn(d.title), d.title).toBeTruthy();
      }
      /* 轉接語輪流用（睇稿指南第 5 節）：輪換嗰七款，一本書每款最多三次，唔會連續兩次同一款 */
      const count = new Map<string, number>();
      openers.forEach((o) => count.set(o, (count.get(o) ?? 0) + 1));
      expect(Math.max(0, ...count.values()), `${i}: ${openers.join(' | ')}`).toBeLessThanOrEqual(3);
      openers.forEach((o, k) => k > 0 && expect(o, `${i}: ${openers.join(' | ')}`).not.toBe(openers[k - 1]));
    }
    expect([...missing]).toEqual([]);
    expect([...lint]).toEqual([]);
  }, 180_000);
});
