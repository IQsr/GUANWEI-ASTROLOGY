import { describe, expect, it } from 'vitest';
import {
  markBook,
  sentences,
  termIndex,
  unexplainedPairs,
  type ChapterInput,
} from '@/lib/zhu';

/**
 * 註層（工單 F1 · 內容系統 §4）
 *
 * 兩條 AC 喺呢度量：
 *   「一句唔會有兩個未解釋術語」
 *   「撳過嘅術語同一本書唔再重複標點」
 *
 * 第三條（全部 noindex 無 OG）喺 `check-routes.mjs`。
 */

function ch(palace: string, ...texts: string[]): ChapterInput {
  return { palace, segments: texts.map((text, i) => ({ slot: `s${i}`, text })) };
}

/** 抽出標咗點嗰啲字。 */
function marked(book: ReturnType<typeof markBook>): string[] {
  return book.flatMap((c) =>
    c.segments.flatMap((s) => s.runs.filter((r) => r.term).map((r) => r.text)),
  );
}

/** 拼返成段字 —— 標點唔可以食咗字。 */
function joined(book: ReturnType<typeof markBook>): string {
  return book
    .flatMap((c) => c.segments.map((s) => s.runs.map((r) => r.text).join('')))
    .join('\n');
}

describe('切句', () => {
  it('標點跟返上一句', () => {
    expect(sentences('命宮在申。它與遷移宮正對。')).toEqual([
      '命宮在申。',
      '它與遷移宮正對。',
    ]);
  });

  it('冇句號嘅一截都算一句', () => {
    expect(sentences('命宮在申')).toEqual(['命宮在申']);
  });

  it('問號感嘆號都算', () => {
    expect(sentences('是嗎？是的！')).toEqual(['是嗎？', '是的！']);
  });
});

describe('⚠ 標錯咗嘅註層比冇註層差', () => {
  /**
   * 四化嘅詞條 id 係一個字（`sihua.祿`）。裸配就會撞正
   * 「祿存」（一粒輔星）同「官祿」（一個宮）——
   * 而一個標錯咗嘅註層，會教一個啱啱學緊嘅人一件錯嘅事。
   */
  it('四化只配「化X」，唔配裸字', () => {
    const sihua = termIndex().filter((t) => t.kind === 'sihua');
    expect(sihua).toHaveLength(4);
    for (const t of sihua) expect(t.match).toBe(`化${t.slug}`);
  });

  it('「祿存」唔會被當成四化', () => {
    const book = markBook([ch('命宮', '祿存同天馬在對宮。')]);
    expect(marked(book).some((m) => m === '化祿' || m === '祿')).toBe(false);
  });

  /**
   * ⚠ 呢一條原本寫成「『天同化祿』會標到化祿」—— 錯咗。
   *
   * 嗰一句嘅第一個術語係**天同**，而一句最多標一個，
   * 所以化祿要等下一句。測試寫錯咗期望，唔係實作錯咗規矩。
   */
  it('「化祿」會標，而且標成兩個字', () => {
    const book = markBook([ch('命宮', '天同在此。天同化祿，安穩有了憑據。')]);
    expect(marked(book)).toEqual(['天同', '化祿']);
  });

  it('長嘅詞行先 —— 「紫微」唔會被切成「紫」', () => {
    const book = markBook([ch('命宮', '紫微在午。')]);
    expect(marked(book)).toEqual(['紫微']);
  });
});

describe('⚠ 一個術語全書只標一次', () => {
  /**
   * AC 寫「撳過嘅術語同一本書唔再重複標點」。
   * 做成「只標第一次」比做成「記住撳過邊啲」好 ——
   * 後者要存狀態（而 localStorage 得兩個 key，G1），
   * 而且重新載入就會由頭標過。一條唔使記嘢嘅規矩守得住。
   */
  it('同一章入面第二次唔標', () => {
    const book = markBook([ch('命宮', '紫微在午。', '紫微又與天府相對。')]);
    expect(marked(book)).toEqual(['紫微', '天府']);
  });

  it('跨章都唔標', () => {
    const book = markBook([ch('命宮', '紫微在午。'), ch('財帛', '紫微的資源在這裡。')]);
    expect(marked(book)).toEqual(['紫微']);
  });

  it('排兩次結果一模一樣', () => {
    const input = [ch('命宮', '紫微在午。天府在對宮。'), ch('財帛', '武曲在此。')];
    expect(marked(markBook(input))).toEqual(marked(markBook(input)));
  });
});

describe('⚠ 一句最多標一個', () => {
  it('兩個新術語喺同一句，只標第一個', () => {
    const book = markBook([ch('命宮', '紫微與天府同宮。')]);
    expect(marked(book)).toEqual(['紫微']);
  });

  it('下一句先輪到第二個', () => {
    const book = markBook([ch('命宮', '紫微與天府同宮。天府主藏。')]);
    expect(marked(book)).toEqual(['紫微', '天府']);
  });
});

describe('標點唔可以食咗字', () => {
  it('拼返出嚟同原文一模一樣', () => {
    const input = [
      ch('命宮', '紫微在午。天府在對宮，武曲化祿。'),
      ch('財帛', '這一章讀財帛，不談金額。'),
    ];
    const back = joined(markBook(input));
    expect(back).toBe('紫微在午。天府在對宮，武曲化祿。\n這一章讀財帛，不談金額。');
  });

  it('一個術語都冇嘅段落照樣拼得返', () => {
    const back = joined(markBook([ch('命宮', '這一章說的是起點，不是終點。')]));
    expect(back).toBe('這一章說的是起點，不是終點。');
  });
});

describe('⚠ 一句兩個未解釋術語 —— 渲染器修唔到', () => {
  /**
   * 渲染器最多做到「一句只標一個」；但如果一句本身就塞咗兩個新術語，
   * 第二個就會冇解釋噉出現喺讀者眼前 —— 而嗰個係**內容**嘅問題。
   * 所以唔靜靜咁揀一個標，而係數出嚟。
   */
  it('數得出邊一句、邊兩個詞', () => {
    const found = unexplainedPairs([ch('命宮', '紫微與天府同宮。')]);
    expect(found).toHaveLength(1);
    expect(found[0]!.terms).toEqual(['紫微', '天府']);
    expect(found[0]!.palace).toBe('命宮');
  });

  it('第二次出現唔再算 —— 嗰陣已經解釋過', () => {
    const found = unexplainedPairs([
      ch('命宮', '紫微在午。天府在子。'),
      ch('財帛', '紫微與天府相對。'),
    ]);
    expect(found).toHaveLength(0);
  });

  it('一句一個唔算', () => {
    expect(unexplainedPairs([ch('命宮', '紫微在午。天府在子。')])).toHaveLength(0);
  });
});
