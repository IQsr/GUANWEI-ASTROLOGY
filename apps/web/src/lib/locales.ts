import type { Locale } from '@/i18n/routing';

/**
 * 每種語言喺切換掣上面點叫（語言切換）
 *
 * ⚠ 名用返嗰種語言自己嘅寫法（「繁體中文」、「English」、將來「한국어」「日本語」），
 * 唔用當前語言譯出嚟 —— 一個睇唔明而家呢種語言嘅人，要認得出自己嗰種。
 *
 * `short` 係導覽上面嗰個細字：兩種語言嗰陣出「中 / EN」；
 * 多過兩種就變成一個下拉選單，列 `name`（見 `LocaleSwitch`）。
 *
 * 加一種語言要做嘅嘢（例如韓文 `ko`）：
 *   一、`i18n/routing.ts` 嘅 `locales` 加 `'ko'`
 *   二、呢度加 `ko: { short: '한', name: '한국어' }` —— 唔加 type check 會爆
 *   三、`messages/ko.json`
 *   四、`app/fonts.ts` 加 Noto Serif KR / Noto Sans KR（TC 冇諺文）
 */
export const LOCALE_LABEL: Record<Locale, { short: string; name: string }> = {
  'zh-Hant': { short: '中', name: '繁體中文' },
  en: { short: 'EN', name: 'English' },
};
