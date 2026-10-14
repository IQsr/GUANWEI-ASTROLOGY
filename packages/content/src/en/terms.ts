/**
 * 英文術語（2026-10-05 · 跟 docs/en-glossary.md，Issac 定：全部跟建議）。
 * 改術語改呢度，唔好喺翻譯表入面散寫。
 */
export const PALACE_EN: Record<string, string> = {
  命宮: 'Life Palace',
  兄弟: 'Siblings Palace',
  夫妻: 'Partnership Palace',
  子女: 'Children Palace',
  財帛: 'Wealth Palace',
  疾厄: 'Health Palace',
  遷移: 'Travel Palace',
  僕役: 'Friends Palace',
  官祿: 'Career Palace',
  田宅: 'Property Palace',
  福德: 'Wellbeing Palace',
  父母: 'Parents Palace',
  身宮: 'Body Palace',
};

/** 星名：拼音（正文、依據都用呢個）；括號意思只喺輔星煞星第一次出現加（見 `starFirst`）。 */
export const STAR_EN: Record<string, { pinyin: string; gloss: string }> = {
  紫微: { pinyin: 'Zi Wei', gloss: 'the Emperor' },
  天機: { pinyin: 'Tian Ji', gloss: 'the Strategist' },
  太陽: { pinyin: 'Tai Yang', gloss: 'the Sun' },
  武曲: { pinyin: 'Wu Qu', gloss: 'the General' },
  天同: { pinyin: 'Tian Tong', gloss: 'the Blessed' },
  廉貞: { pinyin: 'Lian Zhen', gloss: 'the Upright' },
  天府: { pinyin: 'Tian Fu', gloss: 'the Treasury' },
  太陰: { pinyin: 'Tai Yin', gloss: 'the Moon' },
  貪狼: { pinyin: 'Tan Lang', gloss: 'the Wolf' },
  巨門: { pinyin: 'Ju Men', gloss: 'the Great Gate' },
  天相: { pinyin: 'Tian Xiang', gloss: 'the Minister' },
  天梁: { pinyin: 'Tian Liang', gloss: 'the Sage' },
  七殺: { pinyin: 'Qi Sha', gloss: 'the Warrior' },
  破軍: { pinyin: 'Po Jun', gloss: 'the Vanguard' },
  左輔: { pinyin: 'Zuo Fu', gloss: 'the Left Aide' },
  右弼: { pinyin: 'You Bi', gloss: 'the Right Aide' },
  文昌: { pinyin: 'Wen Chang', gloss: 'a Scholar star' },
  文曲: { pinyin: 'Wen Qu', gloss: 'a Scholar star' },
  天魁: { pinyin: 'Tian Kui', gloss: 'a Noble Helper' },
  天鉞: { pinyin: 'Tian Yue', gloss: 'a Noble Helper' },
  祿存: { pinyin: 'Lu Cun', gloss: 'the Keeper of Abundance' },
  天馬: { pinyin: 'Tian Ma', gloss: 'the Horse' },
  擎羊: { pinyin: 'Qing Yang', gloss: 'the Blade' },
  陀羅: { pinyin: 'Tuo Luo', gloss: 'the Weight' },
  火星: { pinyin: 'Huo Xing', gloss: 'Fire' },
  鈴星: { pinyin: 'Ling Xing', gloss: 'Bell' },
  地空: { pinyin: 'Di Kong', gloss: 'Void' },
  地劫: { pinyin: 'Di Jie', gloss: 'Loss' },
  天刑: { pinyin: 'Tian Xing', gloss: 'the Judge' },
};

export const star = (zh: string) => STAR_EN[zh]?.pinyin ?? null;
/** 輔星煞星：拼音加意思（「Huo Xing (Fire)」）；主星淨係拼音 */
export const starFirst = (zh: string) => {
  const s = STAR_EN[zh];
  if (!s) return null;
  return MAJOR.has(zh) ? s.pinyin : `${s.pinyin} (${s.gloss})`;
};
const MAJOR = new Set(['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']);

/** 方面（對應中文 `AREA`）：[名詞, 句首講法] */
export const AREA_EN: Record<string, [string, string]> = {
  性格: ['your character', 'In your character'],
  朋輩: ['your peers', 'Among your peers'],
  感情: ['your love life', 'In love'],
  後輩: ['the people you mentor', 'With the people you mentor'],
  錢: ['your finances', 'With money'],
  身心負荷: ['the load on your body and mind', 'In body and mind'],
  在外表現: ['the way you engage with the wider world', 'Out in the world'],
  朋友圈: ['your circle', 'In your circle'],
  工作: ['your work', 'At work'],
  家: ['your home', 'At home'],
  心境: ['your inner life', 'In your inner life'],
  長輩關係: ['your ties with elders', 'With elders and seniors'],
  /* 時間章結論句：命宮唔講「性格」（2026-10-14） */
  自己的狀態: ['your own state', 'In yourself'],
};
/** 中文句首講法 → 英文（「在外時」→「Out in the world」） */
export const AREA_ON_EN: Record<string, string> = {
  性格上: 'In your character',
  朋輩之間: 'Among your peers',
  感情上: 'In love',
  帶後輩時: 'With the people you mentor',
  錢方面: 'With money',
  身心上: 'In body and mind',
  在外時: 'Out in the world',
  朋友圈裡: 'In your circle',
  工作上: 'At work',
  家裡: 'At home',
  心境上: 'In your inner life',
  對長輩時: 'With elders and seniors',
  /* 給你的話：句子自己有「⋯時」，方面剝走「時」（2026-10-14） */
  對長輩: 'With elders and seniors',
  帶後輩: 'With the people you mentor',
  在外: 'Out in the world',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

/** 宮位章以外嘅章名（詞彙表第三節） */
const OTHER_TITLES: Record<string, string> = {
  '序 · 你的命盤': 'Preface · Your Chart',
  性格的骨架: 'The Shape of Your Character',
  三方四正: 'The Four Directions',
  身宮與五行局: 'The Body Palace and the Five-Element Bureau',
  一生十二步: 'Twelve Steps of a Life',
  這十年: 'These Ten Years',
  這一年: 'This Year',
  給你的話: 'For You',
};

/** 章名：「一 · 命宮」→「I · The Life Palace」 */
export function chapterTitleEn(title: string): string | null {
  if (OTHER_TITLES[title]) return OTHER_TITLES[title];
  const m = /^(\S+) · (\S+)$/.exec(title);
  if (m) {
    const n = CN_NUM.indexOf(m[1]!);
    const p = PALACE_EN[m[2]!];
    if (n > 0 && p) return `${ROMAN[n]} · The ${p}`;
  }
  return null;
}

/** 英文清單：a、b、c → 「a, b and c」（英式，冇 Oxford comma） */
export const listEn = (xs: readonly string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : (xs[0] ?? ''));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── 干支、時辰、五行、數字（序同時間章用）────────────────── */
export const BRANCH_EN: Record<string, string> = {
  子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai',
};
export const STEM_EN: Record<string, string> = {
  甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu', 己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui',
};
/** 時辰對應鐘面（詞彙表：子時 → the Zi hour (11 pm – 1 am)） */
export const HOUR_RANGE: Record<string, string> = {
  子: '11 pm – 1 am', 丑: '1 – 3 am', 寅: '3 – 5 am', 卯: '5 – 7 am', 辰: '7 – 9 am', 巳: '9 – 11 am',
  午: '11 am – 1 pm', 未: '1 – 3 pm', 申: '3 – 5 pm', 酉: '5 – 7 pm', 戌: '7 – 9 pm', 亥: '9 – 11 pm',
};
export const ELEMENT_EN: Record<string, string> = { 金: 'Metal', 木: 'Wood', 水: 'Water', 火: 'Fire', 土: 'Earth' };
/*
 * 干支年嘅生肖講法（2026-10-14 · 英文在地化）：「a Bing Wu year」英文讀者唔知係乜，
 * 加返西方熟悉嘅「the Year of the Fire Horse」。天干定五行（甲乙木⋯），地支定生肖。
 */
const STEM_ELEMENT: Record<string, string> = {
  甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth', 己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
};
const BRANCH_ANIMAL: Record<string, string> = {
  子: 'Rat', 丑: 'Ox', 寅: 'Tiger', 卯: 'Rabbit', 辰: 'Dragon', 巳: 'Snake', 午: 'Horse', 未: 'Goat', 申: 'Monkey', 酉: 'Rooster', 戌: 'Dog', 亥: 'Pig',
};
/** 丙午 → 'Fire Horse'；認唔到就 null */
export const zodiacEn = (stem: string, branch: string): string | null =>
  STEM_ELEMENT[stem] && BRANCH_ANIMAL[branch] ? `${STEM_ELEMENT[stem]} ${BRANCH_ANIMAL[branch]}` : null;

export const MONTH_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NUM_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const numWord = (n: number) => NUM_WORD[n] ?? String(n);
const ORD_WORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
export const ordinalWord = (n: number) => ORD_WORD[n] ?? `${n}th`;
/**
 * 農曆月大約對應嘅西曆月（2026-10-14 · 英文在地化）：農曆月通常遲西曆一個月左右，
 * 正月 ≈ 二月、十二月 ≈ 一月。只係「大約」，畫面寫 around。
 */
export const lunarAround = (n: number) => MONTH_EN[(n % 12) + 1] ?? '';
export const ordinal = (n: number) => {
  const t = n % 100;
  const suf = t >= 11 && t <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${n % 10 > 3 ? 'th' : suf}`;
};

/** 中文數字 → 數：「一九九九」逐位、「二十二」「廿六」「初三」「十四」「三十」 */
export function cnNum(s: string): number | null {
  const D = '〇一二三四五六七八九';
  const h = /^一百(零)?(.*)$/.exec(s);
  if (h) return h[2] ? (cnNum(h[2]) ?? NaN) + 100 : 100;
  const t = s.replace(/^初/, '').replace(/^廿/, '二十').replace(/零/g, '〇');
  if (/^[〇一二三四五六七八九]{3,}$/.test(t)) return Number([...t].map((c) => D.indexOf(c)).join(''));
  const m = /^([一二三四五六七八九])?(十)?([一二三四五六七八九])?$/.exec(t);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  if (!m[2]) return D.indexOf(m[1] ?? m[3]!);
  return (m[1] ? D.indexOf(m[1]) : 1) * 10 + (m[3] ? D.indexOf(m[3]) : 0);
}

/**
 * 出生地：落款入面係用戶揀嘅中文地名。冇中文字就照用；常見嘅有對照；
 * 對照唔到就回 null（測試會列出嚟，唔會漏中文出街）。
 */
const PLACE_EN: Record<string, string> = {
  香港: 'Hong Kong', 九龍: 'Kowloon', 澳門: 'Macau', 台北: 'Taipei', 臺北: 'Taipei', 高雄: 'Kaohsiung', 台中: 'Taichung', 臺中: 'Taichung',
  廣州: 'Guangzhou', 深圳: 'Shenzhen', 上海: 'Shanghai', 北京: 'Beijing', 新加坡: 'Singapore', 吉隆坡: 'Kuala Lumpur',
  倫敦: 'London', 曼徹斯特: 'Manchester', 紐約: 'New York', 三藩市: 'San Francisco', 舊金山: 'San Francisco', 洛杉磯: 'Los Angeles',
  溫哥華: 'Vancouver', 多倫多: 'Toronto', 悉尼: 'Sydney', 雪梨: 'Sydney', 墨爾本: 'Melbourne', 東京: 'Tokyo', 首爾: 'Seoul',
  /* 2026-10-13：落款加地方 —— 同 apps/web lib/luokuan.ts PLACES 一一對應（web 測試量住） */
  桃園: 'Taoyuan', 台南: 'Tainan', 東莞: 'Dongguan', 佛山: 'Foshan', 珠海: 'Zhuhai', 中山: 'Zhongshan',
  江門: 'Jiangmen', 汕頭: 'Shantou', 潮州: 'Chaozhou', 梅州: 'Meizhou', 湛江: 'Zhanjiang', 天津: 'Tianjin',
  重慶: 'Chongqing', 成都: 'Chengdu', 武漢: 'Wuhan', 南京: 'Nanjing', 杭州: 'Hangzhou', 蘇州: 'Suzhou',
  寧波: 'Ningbo', 溫州: 'Wenzhou', 廈門: 'Xiamen', 福州: 'Fuzhou', 泉州: 'Quanzhou', 長沙: 'Changsha',
  南昌: 'Nanchang', 合肥: 'Hefei', 鄭州: 'Zhengzhou', 濟南: 'Jinan', 青島: 'Qingdao', 石家莊: 'Shijiazhuang',
  太原: 'Taiyuan', 西安: "Xi'an", 蘭州: 'Lanzhou', 西寧: 'Xining', 銀川: 'Yinchuan', 烏魯木齊: 'Urumqi',
  拉薩: 'Lhasa', 呼和浩特: 'Hohhot', 瀋陽: 'Shenyang', 大連: 'Dalian', 長春: 'Changchun', 哈爾濱: 'Harbin',
  南寧: 'Nanning', 桂林: 'Guilin', 海口: 'Haikou', 三亞: 'Sanya', 昆明: 'Kunming', 貴陽: 'Guiyang',
  檳城: 'Penang', 怡保: 'Ipoh', 新山: 'Johor Bahru', 馬六甲: 'Malacca', 古晉: 'Kuching', 詩巫: 'Sibu',
  亞庇: 'Kota Kinabalu', 曼谷: 'Bangkok', 清邁: 'Chiang Mai', 雅加達: 'Jakarta', 泗水: 'Surabaya', 棉蘭: 'Medan',
  坤甸: 'Pontianak', 馬尼拉: 'Manila', 宿霧: 'Cebu', 胡志明市: 'Ho Chi Minh City', 河內: 'Hanoi', 金邊: 'Phnom Penh',
  永珍: 'Vientiane', 仰光: 'Yangon', 斯里巴加灣: 'Bandar Seri Begawan', 大阪: 'Osaka', 伯明翰: 'Birmingham', 愛丁堡: 'Edinburgh',
  巴黎: 'Paris', 阿姆斯特丹: 'Amsterdam', 布里斯本: 'Brisbane', 珀斯: 'Perth', 奧克蘭: 'Auckland',
};
export function placeEn(zh: string): string | null {
  if (!/[㐀-鿿]/.test(zh)) return zh;
  return PLACE_EN[zh] ?? null;
}
