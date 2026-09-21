import { describe, expect, it } from 'vitest';
import { CLAIM_MOMENTS, CLAIM_PROMPTS, claimPromptFor, type ClaimFacts } from '@/lib/claim';

/**
 * 工單 G2 第二條 AC：**提示只喺成書後／第二次回訪／付款前出現。**
 *
 * 呢條 AC 真正嘅內容唔係「有呢三個位」，係「**得**呢三個位」——
 * 而「得」係一句量得到嘅說話。
 */

const anon: ClaimFacts = { isAnonymous: true, visitDays: 1, dismissed: false };

describe('⚠ 得三個位', () => {
  it('三個，冇第四個', () => {
    expect(CLAIM_MOMENTS).toHaveLength(3);
    expect([...CLAIM_MOMENTS].sort()).toEqual(['checkout', 'shelf', 'titled']);
    expect(Object.keys(CLAIM_PROMPTS).sort()).toEqual([...CLAIM_MOMENTS].sort());
  });

  /**
   * 呢條係防住「第四個位」嗰條。
   * 將來有人喺某一版叫 `claimPromptFor('book', …)`，佢會攞到 null，
   * 唔會攞到一個「差唔多」嘅提示。
   */
  it('唔喺表入面嘅位，一律唔提', () => {
    for (const m of ['book', 'cast', 'lexicon', 'account', '', 'TITLED']) {
      expect(claimPromptFor(m, { ...anon, visitDays: 2 }), m).toBeNull();
    }
  });

  it('全站得一個位會擋路，而且係付款前嗰個', () => {
    const blocking = Object.values(CLAIM_PROMPTS).filter((p) => p.blocks);
    expect(blocking.map((p) => p.at)).toEqual(['checkout']);
  });

  /** 一個撳一下就冇咗嘅硬閘，唔係硬閘。 */
  it('撳得走嘅位唔會擋路，擋路嘅位撳唔走', () => {
    for (const p of Object.values(CLAIM_PROMPTS)) {
      expect(p.dismissible && p.blocks, p.at).toBe(false);
    }
  });
});

describe('⚠ 認咗領就一次都唔提', () => {
  it('三個位全部收聲', () => {
    for (const m of CLAIM_MOMENTS) {
      expect(claimPromptFor(m, { isAnonymous: false, visitDays: 2, dismissed: false }), m).toBeNull();
    }
  });
});

describe('成書後：講一次就收聲', () => {
  it('未撳走 → 提，而且撳得走', () => {
    const p = claimPromptFor('titled', anon);
    expect(p?.form).toBe('dismissible');
    expect(p?.dismissible).toBe(true);
  });

  it('撳走咗 → 唔提', () => {
    expect(claimPromptFor('titled', { ...anon, dismissed: true })).toBeNull();
  });
});

describe('第二次回訪：係第二日，唔係每一日', () => {
  it.each([1, 3, 4, 10, 40])('第 %i 日唔提', (visitDays) => {
    expect(claimPromptFor('shelf', { ...anon, visitDays })).toBeNull();
  });

  it('第二日提，而且係一條界欄，唔擋路', () => {
    const p = claimPromptFor('shelf', { ...anon, visitDays: 2 });
    expect(p?.form).toBe('rule');
    expect(p?.blocks).toBe(false);
  });
});

describe('⚠ 撳走「成書後」，撳唔走付款前嗰道閘', () => {
  /**
   * 呢條係整份規矩入面最容易寫錯嗰條：一個「dismissed」flag
   * 好自然噉會被當成「唔好再提認領」，跟住連硬閘都收埋 ——
   * 而硬閘一收埋，付款流程就會放一個未認領嘅人入去，
   * 佢畀完錢之後清 cookie 就乜都冇，連投訴都唔知搵邊個。
   */
  it('撳走咗一樣要過閘', () => {
    const p = claimPromptFor('checkout', { ...anon, dismissed: true, visitDays: 9 });
    expect(p?.form).toBe('gate');
    expect(p?.blocks).toBe(true);
  });
});
