import { defineRouting } from 'next-intl/routing';

/**
 * 繁中為主，架構留位。
 *
 * localePrefix: 'as-needed' —— 預設 locale（zh-Hant）冇前綴，
 * 所以 /book/x 就係繁中版，第二語言先會出現 /en/book/x。
 * 而家做係零成本，之後做係重寫（見架構 plan §9）。
 *
 * 'en'（2026-10-05 起）：介面文案用 messages/en.json；命書正文由中文逐句譯
 * （`lib/english.ts`，讀嗰陣譯，唔另外存）。命盤、溯時題目仲係中文。
 */
export const routing = defineRouting({
  locales: ['zh-Hant', 'zh-Hans', 'en'],
  defaultLocale: 'zh-Hant',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
