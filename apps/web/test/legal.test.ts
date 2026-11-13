import { describe, expect, it } from 'vitest';
import { LEGAL, LEGAL_VERSION, hasConsented } from '@/lib/legal';
import { legalDoc } from '@/lib/legal-text';

describe('條款及私隱政策（2026-09-29）', () => {
  it('版本係一個日期', () => {
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('同意過而家呢個版本先算', () => {
    expect(hasConsented(LEGAL_VERSION)).toBe(true);
    expect(hasConsented('2020-01-01')).toBe(false);
    expect(hasConsented(null)).toBe(false);
  });

  /** 同 PRICE.placeholder 一樣：未定嘅值要明顯係假，而且標住 —— 定咗就改 LEGAL 同熄咗佢 */
  it('⚠ 未定嘅值仲係〔假值〕：營運者、聯絡、適用法律', () => {
    expect(LEGAL.placeholder).toBe(true);
    for (const v of [LEGAL.operator, LEGAL.contact, LEGAL.governingLaw]) expect(v).toMatch(/^〔.+〕$/);
  });

  /** 2026-11-13：值未定都好，讀者見到嘅頁面唔可以有〔方括號〕（測試者會以為個站未整好） */
  it('頁面上冇〔方括號〕：四個語言、兩份文件', () => {
    for (const kind of ['terms', 'privacy'] as const) {
      for (const locale of ['zh-Hant', 'zh-Hans', 'en', 'ja']) {
        const doc = legalDoc(kind, locale);
        const text = [doc.title, doc.updated, ...doc.sections.flatMap((x) => [x.h, ...x.p])].join(' ');
        expect(text).not.toMatch(/[〔〕]/);
      }
    }
  });

  it('兩份文件、兩個語言都有齊，而且段數一樣', () => {
    for (const kind of ['terms', 'privacy'] as const) {
      const zh = legalDoc(kind, 'zh-Hant');
      const en = legalDoc(kind, 'en');
      expect(zh.sections.length).toBeGreaterThan(5);
      expect(en.sections.length).toBe(zh.sections.length);
    }
  });

  it('私隱政策講齊規格入面嘅第三方同 cookie', () => {
    const text = legalDoc('privacy', 'zh-Hant').sections.flatMap((s) => s.p).join('');
    for (const w of ['Supabase', 'Stripe', 'NEXT_LOCALE', '匯出', '刪除']) expect(text).toContain(w);
    /* 2026-10-08 起字型自己 host：唔再有 Google Fonts，政策唔好仲講佢 */
    expect(text).not.toContain('Google');
  });
});
