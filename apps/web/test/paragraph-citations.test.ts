import { expect, it } from 'vitest';
import { paragraphCitations, uniqueReferences } from '@/lib/paragraph-citations';
import type { Run } from '@/lib/zhu';

it('每段引用按原次序去重，保留不同來源及逐句原資料', () => {
  const runs: Run[] = [
    { text: '第一句。' }, { text: '', cite: ['one', 'two'] },
    { text: '第二句。' }, { text: '', cite: ['two', 'three'] },
    { text: '編輯建議不掛引用。' },
  ];
  const before = structuredClone(runs);
  const paragraph = paragraphCitations(runs);
  expect(paragraph.citations).toEqual(['one', 'two', 'three']);
  expect(paragraph.runs.map((r) => r.text).join('')).toBe('第一句。第二句。編輯建議不掛引用。');
  expect(runs).toEqual(before);
});

it('只有編輯例子或建議的段落不會憑空加「據」', () => {
  expect(paragraphCitations([{ text: '可以先寫下自己的觀察。' }]).citations).toEqual([]);
});

it('跨頁兩個定位的同一段節錄只展開一次，不合併不同條件或頁碼', () => {
  const first = { id: 'page81', book: '講義', page: 81, pageEnd: 82, section: '巨門子午', text: '成格前提與破格例外。' };
  const alias = { ...first, id: 'page82' };
  const exception = { ...first, id: 'other', sourceNote: '此項原文仍待校。' };
  const next = { ...first, id: 'next', page: 82, pageEnd: 83 };
  const refs = [first, alias, exception, next];
  const before = structuredClone(refs);
  expect(uniqueReferences(refs)).toEqual([first, exception, next]);
  expect(refs).toEqual(before);
});
