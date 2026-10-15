import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { Ja } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 日文版宮位章以外嘅章（序、性格的骨架、三方四正、身宮與五行局、一生十二步、這十年、這一年、給你的話 · 2026-10-15）：
 * 150 張盤逐句譯到、過日文檢查、章名有日文。
 */
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

describe('日文：宮位章以外嘅章', () => {
  it('150 張盤，八章逐句譯到，冇漏中文，過日文檢查', () => {
    const missing = new Set<string>();
    const lint = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const solar = { y: 1950 + ((i * 7) % 60), m: 1 + ((i * 5) % 12), d: 1 + ((i * 11) % 28) };
      const r = cast({ solar, time: { h: (i * 3) % 24, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
      if (!r.ok) continue;
      const drafts = chapterDrafts(bookChapters(r.value, { seed: String(i), year: 2026, solar, place: '香港' }) ?? [], 'ja-test');
      for (const d of drafts.filter((x) => !PALACES.includes(x.slug))) {
        const out = Ja.renderChapter(d.body);
        out.missing.forEach((m) => missing.add(`${d.slug}｜${m}`));
        Ja.scanJapanese(out.text).forEach((c) => lint.add(`${c}：${d.slug}`));
        expect(Ja.chapterTitleJa(d.title), d.title).toBeTruthy();
      }
    }
    expect([...missing]).toEqual([]);
    expect([...lint]).toEqual([]);
  }, 180_000);
});
