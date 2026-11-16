/**
 * Sky Lab（2026-11-16）：紫微斗數與天文、曆法、星命文獻嘅研究報告。
 *
 * 2026-11-16 同 Issac 逐條問清楚之後定嘅規矩（改之前睇返）：
 *   · 讀者係行內人同研究者，唔係命書讀者。完整論文格式，客觀語氣，唔用「我們」講故事。
 *   · 只喺頁尾有連結。命書、起盤、藏經閣唔提 Sky Lab；Sky Lab 入面亦冇起盤掣。
 *   · 署名「星敘 Sky Lab」，暫時冇聯絡方法。
 *   · 中文全文（簡體由 OpenCC 轉）加英文摘要。英、日介面冇呢一欄（middleware 轉返中文）。
 *   · 全部專題列出、標狀態；未完成嘅只寫「欠乜」，唔寫正面結論。
 *   · 只出文字同表：唔公開程式，唔上 demo，唔連去本機原型。
 *   · 論文入面每條引文都要對過原書影像；未對過嘅唔入正文表。
 *
 * 資料來源：tools/sky-lab/research-overview.md（2026-10-17，喺 backup/local-main-2026-10-21 分支）。
 */

export const LAB_LOCALES = ['zh-Hant', 'zh-Hans'] as const;
export const isLabLocale = (l: string) => (LAB_LOCALES as readonly string[]).includes(l);
export const LAB_PATH = '/skylab';
export const LAB_BYLINE = '星敘 Sky Lab';

/* ── 專題一覽 ─────────────────────────────────────────── */

/** 證據類型 */
export type TopicKind = '文獻' | '模型' | '重建';
/** done：已有結果（附界線）· neg：已檢驗，未見支持 · open：未完成 */
export type TopicStatus = 'done' | 'neg' | 'open';

export const STATUS_LABEL: Record<TopicStatus, string> = {
  done: '已有結果',
  neg: '未見支持',
  open: '未完成',
};

export type Topic = {
  no: number;
  title: string;
  kind: TopicKind;
  status: TopicStatus;
  /** done／neg：結果同界線。open：只寫欠乜。 */
  note: string;
  /** 已成文嘅論文 slug */
  paper?: string;
};

export type TopicLine = { no: string; title: string; question: string; topics: Topic[] };

export const LINES: TopicLine[] = [
  {
    no: '一',
    title: '可核對的天空與曆日',
    question: '先建立一個可以回算、可以互核的時間與天空底座。',
    topics: [
      { no: 1, kind: '重建', status: 'done', title: '宋代北天極、北斗、紫微垣的回算，與現代星空及現行排盤對照', note: '古今方向與歲差可以回算。幾何北天極、物理北極星與盤中「紫微」是三件事，須分開；由星空不能直接推出安星公式。' },
      { no: 2, kind: '重建', status: 'done', title: '1054 年客星紀日接回農曆年月日與天空', note: '五月己丑與儒略日、回推公曆日期可以互核。出生鐘時仍屬假設；以現行規則回投，不等於宋代實用命盤。' },
      { no: 3, kind: '重建', status: 'open', title: '按《崇天曆》術文重算 1054 年氣朔、進朔與置閏', note: '術文疑讀、分秒及地域限制未全解，整套古法未校定。' },
    ],
  },
  {
    no: '二',
    title: '規則、星名、順逆與空位的文獻',
    question: '有原文教人怎樣排，不等於有原文解釋當初為何這樣定。',
    topics: [
      { no: 4, kind: '文獻', status: 'done', title: '斗數早期書目、1581 年《捷覽》刊本著錄、道藏本與《全書》的規則比較', note: '規則與版本差異可見。書名著錄、實物刊年、作者署名是三種不同的證據；未見解釋規則由來的創制筆記。' },
      { no: 5, kind: '文獻', status: 'neg', title: '北斗固定名號、往返計數與紫微、天府兩系逐格對照', note: '星名與職司有文本聯繫；但兩個安置家族不等於原來的南北斗星表，其間隔未能由北斗計數導出。' },
      { no: 6, kind: '文獻', status: 'open', title: '《捷覽》《玄藪》《全書》的方向、星序及返程異文', note: '未能建立年代可靠、足以解釋演變的傳承鏈。' },
      { no: 7, kind: '文獻', status: 'open', title: '明刊原頁與《玄藪》轉載影頁的局部逐字校讀', note: '《玄藪》轉載底本的同一性與年代未核實。' },
    ],
  },
  {
    no: '三',
    title: '北斗能否作定序指針',
    question: '斗柄所指能否給出斗數諸星的次序與位置。',
    topics: [
      { no: 8, kind: '模型', status: 'neg', title: '固定觀測時間、北天極、斗柄定義、零點及方向，測七星落宮與次序', note: '次序相似，與安星位置、間隔吻合，是兩個問題；所測映射未能導出整套安星法。' },
      { no: 9, kind: '模型', status: 'neg', title: '單一基準日觀測定序、其後凍結成表的假設', note: '模型可以造出部分固定表形，但不能唯一指定創制日期，也不解釋天府系所需的格距。' },
    ],
  },
  {
    no: '四',
    title: '相似是否只是月份、時辰與恆星時的共同節奏',
    question: '「有相似節奏」與「北斗獨有、足以證明起源」相差很遠。',
    topics: [
      { no: 10, kind: '模型', status: 'neg', title: '命宮、身宮、斗君與北斗指向的跨季節、跨年代對照', note: '身宮有較近似的月時結構，但未見為北斗所特有。' },
      { no: 11, kind: '模型', status: 'done', title: '農曆月與季節錯位、歲差、自行及鐘基準的分解', note: '各項可以互相抵消；平均絕對誤差不能當帶號角度相加，跨年差亦不能全歸歲差。' },
      { no: 12, kind: '模型', status: 'neg', title: '以織女及其他亮星作對照', note: '其他恆星有相近節奏，削弱「唯北斗可解釋」之說。' },
      { no: 13, kind: '模型', status: 'neg', title: '扣除共通恆星時後的剩餘角差', note: '剩餘量可由日期與座標幾何重現；扣除時身宮項本身亦抵消，不能作為身宮來源的新證據。' },
      { no: 14, kind: '模型', status: 'neg', title: '黃道、赤道、地平框架及升點：19 候選 × 2 方向 × 2 規則，76 假說並報', note: '較好的赤道升點結果仍等同一般恆星時模板；未見具史料零點、可同時導出命身兩規則的獨有投影。' },
    ],
  },
  {
    no: '五',
    title: '有天文度數背景的安命法',
    question: '相關星命傳統以太陽度數安命，會否是通往斗數的橋樑。',
    topics: [
      { no: 15, kind: '文獻', status: 'done', title: '《星學大成》太陽度配生時安命：十二宮、粗宿界及順逆', note: '相關星命術確有直接以天文度數安命的原文；未見其轉化為斗數的過渡文獻。' },
      { no: 16, kind: '重建', status: 'open', title: '《三辰通載》二十八宿尺、周天兩讀與條件命宿度', note: '原通用時辰換度法未恢復；古度不能直接當現代角度。' },
      { no: 17, kind: '文獻', status: 'open', title: '精細過宮表及時辰分刻', note: '只得局部細界，未得足以取代均分時辰的完整時間換算。' },
      { no: 18, kind: '文獻', status: 'open', title: '十二宮終點續核', note: '原字層與校改層須分開；時間法與整套古法未復原。' },
    ],
  },
  {
    no: '六',
    title: '吻合是否由循環、取樣、接口或曆法造成',
    question: '對看似吻合的結果逐項做反事實與敏感度檢查。',
    topics: [
      { no: 19, kind: '模型', status: 'neg', title: '初期 8 組與身宮同宮的月時分布，加固定等格對照', note: '8 組是四對相隔六時的結果，等格對照重現同一批宮名；不能算 8 次獨立支持。' },
      { no: 20, kind: '模型', status: 'done', title: '以可核日期的真實農曆月取代借用的節氣月序', note: '吻合的身份與數量隨之改變，月份輸入有決定性影響。' },
      { no: 21, kind: '模型', status: 'open', title: '以 864 個 JPL 太陽時點取代原文節氣宿度', note: '接口與均分時辰仍屬假設，結果不是古法認證。' },
      { no: 22, kind: '模型', status: 'open', title: '以各年代相鄰距星實際赤經寬取代整圈同比例接口', note: '宋代觜、參距星次序未定；宿內歸一仍屬假設。' },
      { no: 23, kind: '模型', status: 'done', title: '三個公曆全年逐日，加連續角差、宮界距離及選日偏移', note: '有限樣本的一致不能推廣；粗分同宮，與連續角度接近，不是同一結論。' },
      { no: 24, kind: '模型', status: 'done', title: '十五年含閏月：三種歸月與固定季節月反事實', note: '結果對月份、季節接法敏感；1054 年並非各年最高。閏月處理只是約定。' },
    ],
  },
  {
    no: '七',
    title: '《三辰通載》',
    question: '一部南宋星命書裡，有沒有斗數規則或星名的來歷。',
    topics: [
      { no: 25, kind: '文獻', status: 'neg', paper: 'bianjia', title: '三十卷錄文全書檢索：月建、月將、安命法、斗數星名', note: '錄文無「月建」「月將」，安命只見太陽加時一法，月建代月將之說無文字支持。斗數多個星名在書中是某曜在某宮或某宿的別名。' },
      { no: 26, kind: '重建', status: 'done', title: '卷三十大觀二年（1108）例：原影轉錄、換日、回算', note: '十二月初八為儒略 1109 年 1 月 10 日；太陽在牛宿 5.7 度，屬丑，與書中「丑上安命」相合。圖不載七政，書中星位無從逐顆核。' },
      { no: 27, kind: '模型', status: 'done', title: '三辰十二宮細界與宿寬的天空年代', note: '宮界為周天 365.255 度的十二等分，零點斗 13.69 度相當於約公元 300 年的冬至點，非宋代實測；宿寬近赤道距星間隔，但不能定年。' },
    ],
  },
];

export const ALL_TOPICS = LINES.flatMap((l) => l.topics);

export const OVERVIEW = {
  title: '紫微斗數與天文：研究總覽',
  date: '2026-11-16',
  dataDate: '2026-10-17',
  abstract: [
    '本計劃只問一個問題：紫微斗數的規則，能否由某一套有史料根據的天文座標、觀測或計數程序導出。不檢驗術數的吉凶或預測效力。',
    '至今完成二十七個專題，分七條主線。結論是：**仍未找到由具體天文觀測或座標程序通往斗數現行安星規則的直接歷史推導鏈。**',
    '現階段既不能說斗數是出生星圖的抽象，也不能說它與天文全無關係。可以確定的是：相關的星命傳統確有以太陽度數安命的原文；斗數與其他材料之間有具體的星名、職司與計數用語可比；而若干看似吻合的現象，可由共通的恆星時節奏與建模選擇解釋。',
  ],
  abstractEn:
    'This programme asks one question: can the placement rules of Zi Wei Dou Shu be derived from any historically attested astronomical coordinate, observation or counting procedure? It does not test predictive validity. Across twenty-seven studies in seven lines of inquiry, no direct historical derivation from an astronomical procedure to the current star-placement rules has been found. Related horoscopic traditions do place the Life palace from the solar position, and star names, offices and counting terms are shared across sources; but several apparent matches are reproduced by ordinary sidereal-time rhythm and by modelling choices. Each study is listed below with its evidence type and status.',
  counting: [
    '二十七個專題是整理口徑，不是二十七次互相獨立的驗證；部分是同一假說的來源核讀、補表、反事實或敏感度續查。',
    '「模型」類結果取決於所列假設（選日、月份接法、宮位粗分、閏月處理等），不是歷史因果的量度。',
    '「未完成」的專題只列所欠，不列結論。',
  ],
  kinds: [
    ['文獻', '結論來自可讀的原文或書目著錄。'],
    ['重建', '按原文或天文回算重建某日的曆日、天空或度數。'],
    ['模型', '在明示假設下的計算比較。'],
  ] as const,
};

/* ── 論文 ─────────────────────────────────────────────── */

export type Block =
  | { k: 'p'; t: string }
  | { k: 'h'; t: string }
  | { k: 'ul'; items: string[] }
  | { k: 'q'; t: string; src: string }
  | { k: 'table'; caption: string; head: string[]; rows: string[][]; note?: string };

export type Paper = {
  slug: string;
  /** 論文編號 */
  id: string;
  title: string;
  titleEn: string;
  version: string;
  date: string;
  /** 稿本狀態：核讀未完就要寫明 */
  draftNote?: string;
  topics: number[];
  abstract: string;
  abstractEn: string;
  keywords: string[];
  sections: { no: string; title: string; blocks: Block[] }[];
  notes: string[];
  refs: string[];
};

export const PAPERS: Paper[] = [
  {
    slug: 'bianjia',
    id: 'SL-01',
    title: '《三辰通載》變叚星表所見斗數星名',
    titleEn: 'Dou Shu star names in the bianjia tables of the Sanchen tongzai',
    version: '稿本 0.1',
    date: '2026-11-16',
    draftNote:
      '本稿為初稿。變叚星表十一曜、十二宮共約一百三十二格，目前只有三格逐字核過原書影像；表一只收這三格。全表核讀完成後更新。',
    topics: [25],
    abstract:
      '《三辰通載》是南宋的七政四餘星命書。書中各曜卷末附「變叚星」表，為該曜在十二宮各立一名，並繫歌訣。本文報告表中與紫微斗數主星同名的條目。經逐字核對原書影像者三條：水星在陰陽宮名紫微星，土星在巨蟹宮名天相星，土星在天蝎宮名天梁星。三名在書中均指某一曜行至某一宮，有確定的天文所指；斗數同名諸星則按生年月日時計數安置，不取七政實際位置。書中未見把這些別名改為按生辰計數安置的文字。因此，星名相同不能證明斗數安星法出於此書。',
    abstractEn:
      'The Sanchen tongzai is a Southern Song horoscopic manual of the Seven Governors and Four Remainders. At the end of each planet’s chapters it gives a bianjia (“borrowed name”) table assigning the planet a different name, with a verse, in each of the twelve signs. This note reports entries whose names coincide with major stars of Zi Wei Dou Shu. Three entries have been collated character by character against the scanned exemplar: Mercury in Gemini (shen) is called Ziwei; Saturn in Cancer (wei) is called Tianxiang; Saturn in Scorpio (mao) is called Tianliang. In this text each name denotes a planet in a sign. In Dou Shu the homonymous stars are placed by counting from the birth year, month, day and hour, without reference to planetary positions, and the text nowhere converts these names into count-based placements. Shared names therefore do not show that the Dou Shu placement rules derive from this book. Collation of the full table is in progress.',
    keywords: ['三辰通載', '七政四餘', '變叚星', '紫微斗數', '星名'],
    sections: [
      {
        no: '一',
        title: '問題',
        blocks: [
          { k: 'p', t: '紫微斗數諸星按生年、月、日、時計數安置，不取日月五星的實際位置。其星名何來，現存斗數書沒有交代。' },
          { k: 'p', t: '本文只處理一個可以核對的問題：在一部以實際天象論命的南宋星命書裡，這些星名是否已經出現；如已出現，所指為何。' },
        ],
      },
      {
        no: '二',
        title: '材料與方法',
        blocks: [
          { k: 'h', t: '2.1 版本' },
          { k: 'p', t: '所用為識典古籍平台所收《三辰通載》三十卷，題「［宋］錢如璧」，平台標「粗校」，附原書掃描影像〔1〕。' },
          { k: 'p', t: '據趙江紅考述，此書僅存靜嘉堂文庫藏清人影宋抄本，成書於南宋中期，原三十四卷，存三十卷〔2〕。平台本卷數與之相合，但平台本是否即靜嘉堂本，本文未能確定〔註二〕。' },
          { k: 'h', t: '2.2 兩個證據層級' },
          { k: 'ul', items: [
            '影像層：在平台閱讀器逐字核讀原書掃描影像。本文正文的引文與表一，只用這一層。',
            '錄文層：平台提供的文字錄文，簡體，未經精校。本文只用它定位，以及在 3.3 節報告全文檢索的結果，並標明。',
          ] },
          { k: 'h', t: '2.3 宮名與地支' },
          { k: 'p', t: '書中十二宮用寶瓶、磨竭、人馬、天蝎、天秤、雙女、獅子、巨蟹、陰陽、金牛、白羊、雙魚之名。各宮所當地支，以歌訣自述為據，不另作換算。' },
        ],
      },
      {
        no: '三',
        title: '結果',
        blocks: [
          { k: 'h', t: '3.1 已核影像的三條' },
          {
            k: 'table',
            caption: '表一　變叚星表中與斗數主星同名的條目（已核影像）',
            head: ['星名', '所指', '又名', '出處', '核讀日期'],
            rows: [
              ['紫微星', '水星在陰陽宮（申）', '天德星', '卷十七 水星變叚星', '2026-10-17'],
              ['天相星', '土星在巨蟹宮（未）', '天福星', '卷十三 土星變叚名', '2026-11-16'],
              ['天梁星', '土星在天蝎宮（卯）', '天保星', '卷十三 土星變叚名', '2026-11-16'],
            ],
            note: '「鎮星」為土星古名。',
          },
          { k: 'q', src: '卷十七 水星變叚星', t: '陰陽宮紫微星，又名天德星，福祿全美。陰陽水會紫微星，富足奢華有始終。更得妻財增貴盛，子孫榮舉孝廉中。' },
          { k: 'q', src: '卷十三 土星變叚名', t: '巨蟹宮天相星，又名天福星，為事反覆無定。天相鎮星未中央，性好清閑本善良。若見孛星金助月，功名顯赫佐朝堂。' },
          { k: 'q', src: '卷十三 土星變叚名', t: '天蝎宮天梁星，又名天保星，多藝能，掌握祿位。卯宮鎮星號天梁，足有資財旺此方。更得學堂三五用，兒孫代代出朝郎。' },
          { k: 'h', t: '3.2 宮與地支的對應' },
          { k: 'p', t: '「卯宮鎮星號天梁」一句同時給出宮（天蝎）、支（卯）、曜（鎮星）、名（天梁）；「天相鎮星未中央」同理，巨蟹當未。紫微星一條的歌訣不言地支。陰陽宮當申，據土星表的宮序推定：該宮列於巨蟹（未）與金牛（「酉上都堂土喜居」）之間。' },
          { k: 'h', t: '3.3 錄文層的全文檢索' },
          { k: 'p', t: '以下屬錄文層，未核影像。錄文有誤字，零命中不等於原書所無。' },
          { k: 'ul', items: [
            '零命中：武曲、天同、廉貞、貪狼、巨門、七殺；化祿、化權、化科、化忌；文曲、左輔、天鉞、擎羊、陀羅、鈴星。',
            '有命中、而見於變叚星表或宿號者：祿存、天魁、右弼、地劫、破軍、紅鸞、華蓋、咸池、天機、天府。各條待核影像後入表。',
          ] },
        ],
      },
      {
        no: '四',
        title: '討論',
        blocks: [
          { k: 'p', t: '三條所示：紫微、天相、天梁之名，在一部以實際天象論命的南宋星命書裡，是某一曜行至某一宮時的稱號。名有確定的天文所指，且一曜十二名，隨宮而變。' },
          { k: 'p', t: '這與斗數的用法不同。斗數的紫微、天相、天梁各是一顆獨立的星，位置由生年月日時計數而得，與水星、土星所在無涉。' },
          { k: 'p', t: '本文不能支持以下推論：' },
          { k: 'ul', items: [
            '斗數的安星法出於此書。書中未見把變叚名改為按生辰計數安置的文字。',
            '斗數的紫微即水星。兩者同名，所指不同。',
            '斗數星名取自此書。同名可以出於共同的更早來源；本文沒有材料判斷借用方向。',
          ] },
        ],
      },
      {
        no: '五',
        title: '局限',
        blocks: [
          { k: 'ul', items: [
            '核讀範圍：全表約一百三十二格，已核三格。',
            '版本：只用一個平台本，未與他本對校；平台本與靜嘉堂本的關係未定。',
            '年代：成書年代依〔2〕，而〔2〕本文只讀到摘要。',
            '闕卷：原書末四卷已佚，本文所見不包括佚卷。',
            '斗數一方：本文未對斗數現存刊本的年代作獨立考訂〔註一〕。',
          ] },
        ],
      },
    ],
    notes: [
      '註一　斗數現存刊本的年代，屬專題 4 的範圍，該專題尚未成文。本文正文不依賴兩者的先後。',
      '註二　趙文全文未取得，卷目並非由該文而來。',
    ],
    refs: [
      '〔1〕［宋］錢如璧：《三辰通載》三十卷。識典古籍平台，https://www.shidianguji.com/book/7461522579262537769 （2026-10-17、2026-11-16 檢視）。',
      '〔2〕趙江紅：〈靜嘉堂藏孤本《三辰通載》考略〉，《中國典籍與文化》2020 年第 2 期，頁 131–144。本文僅據摘要。',
    ],
  },
];

export const paperOf = (slug: string) => PAPERS.find((p) => p.slug === slug) ?? null;
export const paperHref = (p: Paper) => `${LAB_PATH}/${p.slug}`;
/** 引用格式 */
export const citeOf = (p: Paper, url: string) => `${LAB_BYLINE}：〈${p.title}〉，${p.id}，${p.version}，${p.date}。${url}`;
