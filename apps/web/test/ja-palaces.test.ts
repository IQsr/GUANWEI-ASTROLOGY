import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { Ja } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 日文版十二宮章（2026-10-15）：隨機 150 張盤，十二宮章逐句譯晒、過日文檢查、章名有日文。
 * 中文改咗而翻譯表冇跟，呢個測試會列出邊句冇譯。
 */
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

describe('日文：十二宮章', () => {
  it('150 張盤，每章每句都譯到，冇漏中文，過日文檢查', () => {
    const missing = new Set<string>();
    const lint = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const solar = { y: 1950 + ((i * 7) % 60), m: 1 + ((i * 5) % 12), d: 1 + ((i * 11) % 28) };
      const r = cast({ solar, time: { h: (i * 3) % 24, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
      if (!r.ok) continue;
      const drafts = chapterDrafts(bookChapters(r.value, { seed: String(i), year: 2026, solar, place: '香港' }) ?? [], 'ja-test');
      for (const d of drafts.filter((x) => PALACES.includes(x.slug))) {
        const out = Ja.renderChapter(d.body);
        out.missing.forEach((m) => missing.add(m));
        Ja.scanJapanese(out.text).forEach((c) => lint.add(`${c}：${d.slug}`));
        expect(out.text.split('\n\n'), d.slug).toHaveLength(d.body.split('\n\n').length);
        expect(Ja.chapterTitleJa(d.title), d.title).toBeTruthy();
      }
    }
    expect([...missing]).toEqual([]);
    expect([...lint]).toEqual([]);
  }, 180_000);
});
