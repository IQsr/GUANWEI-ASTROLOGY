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

  it('星嘅頭一句自己一段：下一段嘅「它」跟上一段，唔跟後面嗰粒（五盤通讀 B 財帛）', () => {
    const r = Ja.renderParagraphs(['你的財帛宮沒有主星，借對面福德宮的武曲、貪狼來讀。', '武曲本就是財帛主，這是它最順的一格。', '《全書》寫「豐足化吉有巨萬家資」：錢是你最順手的一環。它對數字有感覺，也願意承擔相應的風險。貪狼賺取資源跟著機會走，看到就撲上去，看不到就閒著。']).paras[2]!;
    expect(r).toContain('武曲は数字への勘');
  });

  it('「它」指化科嘅文昌：上一句講緊文昌就留「この星」（五盤通讀 D 福德）', () => {
    const r = Ja.renderParagraphs(['天梁：不是被讚，是自己那一關過得去。文昌化科，條理與文字被看見，把事情說清楚本身就是強項。它修飾的是呈現方式，不改變事情的方向。']).paras[0]!;
    expect(r).toContain('この星が整えるのは');
    expect(r).not.toContain('天梁が整える');
  });
});

describe('日文：給你的話方面前綴唔重複（2026-10-16 第二輪審稿 I/給你的話/2）', () => {
  it('句子自己已經講「お金の管理では」就唔再加「お金の面では」', () => {
    /* 2026-10-18：原本用財帛·天相「理財重秩序」，A2 第三步改咗結論；換用冇改過嘅財帛·貪狼 */
    const r = Ja.renderParagraphs(['三、錢方面，你賺錢跟著機會走：看到就撲上去。']).paras[0]!;
    expect(r).not.toContain('お金の面では、お金の');
    expect(r).toContain('三つ目：お金の稼ぎ方は');
  });
});
