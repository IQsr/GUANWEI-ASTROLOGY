import { defineRouting } from 'next-intl/routing';

/**
 * 繁中為主，架構留位。
 *
 * localePrefix: 'as-needed' —— 預設 locale（zh-Hant）冇前綴，
 * 所以 /book/x 就係繁中版，第二語言先會出現 /en/book/x。
 * 而家做係零成本，之後做係重寫（見架構 plan §9）。
 *
 * 'en' 暫時只係用嚟證明 routing 同文案分離行得通，
 * 未打算出英文版。
 */
export const routing = defineRouting({
  locales: ['zh-Hant', 'en'],
  defaultLocale: 'zh-Hant',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
