import data from './cards/ming-translations.json';
import { STAR_JA, HUA_JA } from './ja/terms';

export { MING_TRANSLATION_VERSION } from './ming-version';
export type MingLocale = 'en' | 'ja';
const entries = data.entries as Record<string, { zh: string; en: string; ja: string }>;
const headings = data.headings as Record<string, { en: string; ja: string }>;

/** 翻譯存檔原句，不重新選卡；句子或來源 ID 不符便不套用譯文。 */
export function mingTranslation(id: string, zh: string, locale: MingLocale): string | null {
  const row = entries[id];
  return row?.zh === zh ? row[locale] : null;
}

export function mingHeading(zh: string, locale: MingLocale): string | null {
  return headings[zh]?.[locale] ?? null;
}

export const MING_EVIDENCE_TOPICS: Record<string, { en: string; ja: string }> = {
  本質: { en: 'Who you are', ja: '性質' },
  處事: { en: 'Approach', ja: '物事への向き合い方' },
  待人: { en: 'Relationships', ja: '人との関わり方' },
  格局: { en: 'Configuration', ja: '格局' },
};
const stars = (text: string) => {
  const names = text.split('、');
  return names.every((s) => s in STAR_JA) ? names.map((s) => STAR_JA[s]!.kanji).join('・') : null;
};

/** 只翻譯已存檔盤面事實，不重新起盤或推導條件。 */
export function mingEvidenceJa(text: string): string | null {
  let m = /^你的命宮沒有主星，借對宮的(.+)來看$/.exec(text);
  if (m) {
    const list = stars(m[1]!);
    return list ? `あなたの命宮には主星がないので、向かいの宮の${list}を借りて読みます` : null;
  }
  // 「天同坐」的「同」是星名一部分，不能先當成「同坐」吃掉。
  for (const re of [/^你的命宮是(.+)同坐([子丑寅卯辰巳午未申酉戌亥])宮$/, /^你的命宮是(.+)坐([子丑寅卯辰巳午未申酉戌亥])宮$/]) {
    m = re.exec(text);
    if (m) {
      const list = stars(m[1]!);
      if (list) return `あなたの命宮は${m[2]}の宮にあり、${list}が入っています`;
    }
  }
  const item = (s: string): string | null => {
    const hua = /^(.+)化([祿權科忌])$/.exec(s);
    return hua && STAR_JA[hua[1]!] ? `${STAR_JA[hua[1]!]!.kanji}の${HUA_JA[hua[2]!]}` : stars(s);
  };
  m = /^(.+)的三方四正見(.+)$/.exec(text);
  if (m) {
    const anchor = stars(m[1]!);
    const companions = m[2]!.split('、').map(item);
    if (anchor && companions.every(Boolean)) return `${anchor}の三方四正には${companions.join('・')}があります`;
  }
  m = /^(.+)化([祿權科忌])$/.exec(text);
  if (m && stars(m[1]!)) return `${stars(m[1]!)}が${HUA_JA[m[2]!]}しています`;
  return null;
}
