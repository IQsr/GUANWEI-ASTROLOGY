/**
 * 日文術語（2026-10-15 · 跟 docs/ja-glossary.md：日本紫微斗数慣用寫法，新字體）。
 * 改術語改呢度，唔好喺翻譯表入面散寫。
 */
export const PALACE_JA: Record<string, string> = {
  命宮: '命宮',
  兄弟: '兄弟宮',
  夫妻: '夫妻宮',
  子女: '子女宮',
  財帛: '財帛宮',
  疾厄: '疾厄宮',
  遷移: '遷移宮',
  僕役: '交友宮',
  官祿: '官禄宮',
  田宅: '田宅宮',
  福德: '福徳宮',
  父母: '父母宮',
  身宮: '身宮',
};

/** 星名：漢字（新字體）同讀音。讀音留畀註層加ふりがな，正文淨出漢字。 */
export const STAR_JA: Record<string, { kanji: string; kana: string }> = {
  紫微: { kanji: '紫微', kana: 'しび' },
  天機: { kanji: '天機', kana: 'てんき' },
  太陽: { kanji: '太陽', kana: 'たいよう' },
  武曲: { kanji: '武曲', kana: 'ぶきょく' },
  天同: { kanji: '天同', kana: 'てんどう' },
  廉貞: { kanji: '廉貞', kana: 'れんてい' },
  天府: { kanji: '天府', kana: 'てんぷ' },
  太陰: { kanji: '太陰', kana: 'たいいん' },
  貪狼: { kanji: '貪狼', kana: 'どんろう' },
  巨門: { kanji: '巨門', kana: 'こもん' },
  天相: { kanji: '天相', kana: 'てんそう' },
  天梁: { kanji: '天梁', kana: 'てんりょう' },
  七殺: { kanji: '七殺', kana: 'しちさつ' },
  破軍: { kanji: '破軍', kana: 'はぐん' },
  左輔: { kanji: '左輔', kana: 'さほ' },
  右弼: { kanji: '右弼', kana: 'うひつ' },
  文昌: { kanji: '文昌', kana: 'ぶんしょう' },
  文曲: { kanji: '文曲', kana: 'ぶんきょく' },
  天魁: { kanji: '天魁', kana: 'てんかい' },
  天鉞: { kanji: '天鉞', kana: 'てんえつ' },
  祿存: { kanji: '禄存', kana: 'ろくそん' },
  天馬: { kanji: '天馬', kana: 'てんば' },
  擎羊: { kanji: '擎羊', kana: 'けいよう' },
  陀羅: { kanji: '陀羅', kana: 'だら' },
  火星: { kanji: '火星', kana: 'かせい' },
  鈴星: { kanji: '鈴星', kana: 'れいせい' },
  地空: { kanji: '地空', kana: 'ちくう' },
  地劫: { kanji: '地劫', kana: 'ちこう' },
  天刑: { kanji: '天刑', kana: 'てんけい' },
};

export const HUA_JA: Record<string, string> = { 祿: '化禄', 權: '化権', 科: '化科', 忌: '化忌' };

export const starJa = (zh: string) => STAR_JA[zh]?.kanji ?? null;

/** 日文並列：a・b・c（星名、宮名用中黒） */
export const listJa = (xs: readonly string[]) => xs.join('・');

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

/** 「一 · 命宮」→「一 · 命宮」；「八 · 僕役」→「八 · 交友宮」。其餘章名未譯回 null。 */
export function chapterTitleJa(title: string): string | null {
  const m = /^(\S+) · (\S+)$/.exec(title);
  if (!m || CN_NUM.indexOf(m[1]!) <= 0) return null;
  const p = PALACE_JA[m[2]!];
  return p ? `${m[1]} · ${p}` : null;
}
