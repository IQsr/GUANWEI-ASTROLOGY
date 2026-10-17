/**
 * 出處註（2026-10-12）：講得肯定嘅句，句尾撳得出原文 —— 書、頁、節、原句。
 */
import { describe, expect, it } from 'vitest';
import { BRANCH_TOPICS, BASE_BLOCKS, DAXIAN_HUA, PALACE_PLAIN, citation, citeOf, En } from '../src/index';

const sentences = (t: string) => t.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [];

describe('出處註', () => {
  it('細讀每一句都配到出處，出處有頁碼、節、原文', () => {
    for (const t of BRANCH_TOPICS)
      for (const r of t.rules)
        for (const s of sentences(r.text)) {
          const ids = citeOf(s);
          expect(ids, `${r.id}：${s}`).toEqual([r.source.passage, ...(r.also ?? []).map((a) => a.passage)]);
          for (const id of ids!) {
            const c = citation(id)!;
            expect(c.page).toBeGreaterThan(0);
            expect(c.section).not.toBe('');
            expect(c.text.length).toBeGreaterThan(8);
          }
        }
  });

  it('四化句入書時前面加咗「天機化祿在你的⋯：」都配得到', () => {
    const h = DAXIAN_HUA[0]!;
    expect(citeOf(`${h.star}化${h.hua}在你的官祿宮：${h.text}`)).toEqual([h.source.passage_id]);
  });

  it('英文細讀同四化句都配得到', () => {
    for (const t of BRANCH_TOPICS) for (const r of t.rules) expect(citeOf(r.en, 'en'), r.id).not.toBeNull();
    const h = DAXIAN_HUA[0]!;
    const en = En.renderParagraph(h.text).text;
    expect(citeOf(en, 'en'), en).toEqual([h.source.passage_id]);
  });

  it('舊有宮位結論、基塊唔會誤配出處（未轉做分支之前唔加註）', () => {
    /* 2026-10-18 · A2 第三步：逐格對過宮垣論、有 `source` 嘅結論先有註，其餘照舊唔准有 */
    const unchecked = PALACE_PLAIN.filter((x) => !x.source).map((x) => x.summary);
    const wrong = [...unchecked, ...BASE_BLOCKS.flatMap((b) => sentences(b.body))].filter((s) => citeOf(s));
    expect(wrong).toEqual([]);
  });

  it('對過嘅結論句：註嘅就係佢自己嗰格嘅原文', () => {
    const checked = PALACE_PLAIN.filter((x) => x.source);
    expect(checked.length).toBeGreaterThan(0);
    for (const x of checked) expect(citeOf(x.summary), x.id).toEqual([x.source!.passage_id]);
  });
});
