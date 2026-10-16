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

describe('日文：「この星」指得清楚（2026-10-16）', () => {
  it('上一句係煞星或者未提過星，就換做主星名', () => {
    const r = Ja.renderParagraphs(['天同在遷移，出外隨和。', '加上擎羊同宮，在外反應快，也容易與人正面撞上。它在外的反應比在家更直。']).paras[1]!;
    expect(r).toContain('天同は、家にいるとき');
    const s = Ja.renderParagraphs(['你的消耗來得慢、發現得遲，疲勞多半在事情已經拖成大事之後才顯出來。對它有用的不是學會休息，是把事情提早攤開。天梁的耗損來自替別人扛——它接得太自然，以至於自己也不覺得那是負擔。']).paras[0]!;
    expect(s).toContain('天梁に役立つのは');
    expect(s).not.toContain('この星');
  });
});
