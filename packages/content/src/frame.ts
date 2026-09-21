/**
 * L5 章框（工單 C7）
 *
 * 出處：內容系統 §3、§5、§6、§7、docs/voice-spec.md §3、§4、§19
 *
 * ── 章框係乜，唔係乜 ──
 *
 * 內容系統 §6 嘅插槽表入面，L5 佔兩格：
 *
 *   開場  ← L1 基塊首句        章框喺佢前面加一句**導語**
 *   留白  ← L5 收束句庫        章框嘅本體，同宮輪替，25–45 字
 *
 * 再加一種唔喺插槽表但係 §7 明文准許嘅嘢：**過場句**
 * （「生成過場句（≤25 字，唔帶新資訊）」—— AI 收尾嘅白名單）。
 *
 * ── 一個關鍵分別：章框冇來源要求 ──
 *
 * 基塊要兩個來源，修飾語要一個，格局要具名文獻。章框**一個都唔使**。
 *
 * 唔係因為佢冇咁緊要，而係因為**佢冇對斗數作出任何主張**。
 * 「這一章讀財帛宮，不談金額」講緊我哋自己嘅編輯規矩，唔係講紫微斗數；
 * 「你手上的錢，有多少是等回來的」係一條問題，唔係一個斷言。
 *
 * 但呢個豁免要有代價，否則佢就會變成一道後門：
 * **章框一個字都唔准講命理。**
 * 冇星名、冇化別、冇廟旺、冇煞曜。schema 自己擋住。
 *
 * 一句「天梁在此宜守」放喺留白句度，就係一條冇出處嘅象義斷言 ——
 * 而且係喺全章最後、讀者最記得嗰個位置。所以擋喺 schema，唔靠人記得。
 *
 * ── 收束句點解要輪替 ──
 *
 * 工單 AC：「收束句每宮 3–5 條輪替，唔會每章結尾一個樣」。
 *
 * 真正要避嘅唔係「一本書入面十二章結尾同一句」（每宮各自寫，本來就唔同），
 * 而係**兩個讀者攞到一模一樣嘅結尾**。一句人人都收到嘅留白句，
 * 就係一句人人都啱嘅話 —— 即係巴納姆。
 *
 * 所以輪替用命盤指紋做種，`pickClose(palace, seed)`：
 * 同一本書永遠揀返同一句（C8b 要求可重現），唔同嘅書會揀到唔同句。
 */
import { z } from 'zod';
import { cjkCount } from './lexicon';
import { similarity } from './baseblock';
import { MALEFICS } from './modifier';

export const FrameKind = z.enum(['open', 'transition', 'close']);
export type FrameKind = z.infer<typeof FrameKind>;

const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'] as const;

/** §6 插槽次序。過場句要講得出佢由邊格去邊格。 */
export const SLOTS = ['開場', '結構', '牽動', '擾動', '留白'] as const;
export type Slot = (typeof SLOTS)[number];

/**
 * 每宮嘅**錨詞**：收束句最少要中一個。
 *
 * 呢個係比相似度更硬嘅反巴納姆閘。相似度只捉得到「兩句太似」，
 * 捉唔到「一句邊一宮都啱」—— 而後者先係留白句最容易犯嘅錯。
 *
 * ⚠ 錨詞**唔包宮名本身**。寫「這一宮講財帛」係貼個標籤，唔係講緊內容；
 * 要過呢道閘，句子入面要真係出現錢、收入、資源呢類講緊嗰件事嘅字。
 */
export const PALACE_ANCHORS: Record<string, string[]> = {
  命宮: ['自己', '性情', '起點', '樣子', '獨處'],
  兄弟: ['平輩', '同輩', '手足', '並肩', '開口'],
  夫妻: ['親密', '伴侶', '相處', '靠近', '兩個人'],
  子女: ['下一代', '創造', '培育', '晚輩', '養大'],
  財帛: ['錢', '收入', '資源', '花錢', '賺'],
  疾厄: ['身體', '累', '負荷', '休息', '撐'],
  遷移: ['陌生', '出門', '在外', '外面', '離開'],
  僕役: ['朋友', '合作', '人群', '交情', '找人'],
  官祿: ['工作', '做事', '成果', '辛苦', '日子'],
  田宅: ['家', '住', '空間', '搬', '地方'],
  福德: ['安靜', '享受', '內在', '喜歡', '舒服'],
  父母: ['長輩', '權威', '規矩', '上一輩', '聽完'],
};

/**
 * 章框入面一個都唔准出現嘅字 —— 出現即係一條冇出處嘅象義斷言。
 *
 * 十四主星、六吉、六煞、四化、廟旺檔。
 */
export const FORBIDDEN_TERMS = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰',
  '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬',
  ...MALEFICS,
  '化祿', '化權', '化科', '化忌', '四化',
  '廟', '旺', '落陷', '利陷',
];

export const Frame = z
  .object({
    id: z.string().regex(/^frame\.(open|transition|close)\.[^\s]+$/, 'id 要係 frame.kind.…'),
    kind: FrameKind,
    /** open / close 必填；transition 一定要空 —— 過場句唔屬於任何一宮。 */
    palace: z.string().optional(),
    from: z.enum(SLOTS).optional(),
    to: z.enum(SLOTS).optional(),
    text: z.string().min(1),
    status: z.enum(['draft', 'reviewed', 'published']),
    note: z.string().optional(),
  })
  .superRefine((f, ctx) => {
    const w = cjkCount(f.text);
    const bad = FORBIDDEN_TERMS.filter((t) => f.text.includes(t));
    if (bad.length) {
      ctx.addIssue({
        code: 'custom',
        message: `${f.id}：章框唔准講命理，出現咗「${bad.join('、')}」—— 呢啲字要有出處，章框冇`,
      });
    }

    if (f.kind === 'transition') {
      if (f.palace) ctx.addIssue({ code: 'custom', message: `${f.id}：過場句唔屬於任何一宮` });
      if (!f.from || !f.to) {
        ctx.addIssue({ code: 'custom', message: `${f.id}：過場句要講得出由邊格去邊格` });
      } else if (SLOTS.indexOf(f.from) >= SLOTS.indexOf(f.to)) {
        ctx.addIssue({ code: 'custom', message: `${f.id}：${f.from} → ${f.to} 唔係向前行` });
      }
      /* §7：過場句 ≤25 字，唔帶新資訊。太短就唔係句子，太長就開始講嘢。 */
      if (w < 8 || w > 25) {
        ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，過場句要 8–25（內容系統 §7）` });
      }
      if (/\d/.test(f.text)) {
        ctx.addIssue({ code: 'custom', message: `${f.id}：過場句唔准有數字 —— 數字就係新資訊` });
      }
      return;
    }

    if (f.from || f.to) ctx.addIssue({ code: 'custom', message: `${f.id}：只有過場句先有 from/to` });
    if (!f.palace || !PALACES.includes(f.palace as never)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：唔認得宮位 ${f.palace}` });
      return;
    }
    if (!f.id.split('.')[2]?.startsWith(f.palace)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：id 同 palace 唔夾` });
    }

    if (f.kind === 'open') {
      /* 章首導語 30–50 字。佢嘅工作係講「呢章讀乜、唔讀乜」。 */
      if (w < 30 || w > 50) {
        ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，開場導語要 30–50` });
      }
      /*
       * §4 五個高風險宮：導語一定要明寫本章唔做乜。
       * 寫喺章首，唔係章末細字 —— 讀者要喺開始睇之前就知道界線喺邊。
       */
      if (['疾厄', '夫妻', '子女', '父母', '財帛'].includes(f.palace) && !f.text.includes('不')) {
        ctx.addIssue({
          code: 'custom',
          message: `${f.id}：高風險宮嘅導語一定要明寫本章唔做乜（內容系統 §5）`,
        });
      }
      return;
    }

    /* close —— 留白句 25–45 字（§6 插槽表）。 */
    if (w < 25 || w > 45) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，留白句要 25–45（內容系統 §6）` });
    }
    /*
     * 留白句係「交返畀讀者」嗰一句（§5 三分結構：結構 → 傾向 → 留白）。
     * 唔對住讀者講嘅留白句，就唔係留白，係多一句結論。
     */
    if (!/你|自己/.test(f.text)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：留白句要對住讀者講，唔係多一句結論` });
    }
    const anchors = PALACE_ANCHORS[f.palace] ?? [];
    if (!anchors.some((a) => f.text.includes(a))) {
      ctx.addIssue({
        code: 'custom',
        message: `${f.id}：一個錨詞都冇中（${anchors.join('／')}）—— 一句邊一宮都啱嘅留白句就係巴納姆`,
      });
    }
  });

export type Frame = z.infer<typeof Frame>;

export function buildFrames(raw: unknown[]): Frame[] {
  const out = raw.map((r) => Frame.parse(r));
  const seen = new Set<string>();
  for (const f of out) {
    if (seen.has(f.id)) throw new Error(`章框 ID 重複：${f.id}`);
    seen.add(f.id);
  }
  for (const palace of PALACES) {
    const n = out.filter((f) => f.kind === 'close' && f.palace === palace).length;
    if (n < 3 || n > 5) throw new Error(`${palace}：${n} 條收束句，要 3–5 條輪替（工單 C7）`);
    if (out.filter((f) => f.kind === 'open' && f.palace === palace).length !== 1) {
      throw new Error(`${palace}：開場導語要剛好一條`);
    }
  }
  return out;
}

/* ──────────────────────────────────────────────
   輪替：同一本書永遠一樣，唔同嘅書唔一樣
   ────────────────────────────────────────────── */

/** 同 rule.ts / school-profile.ts 一樣嘅 FNV-1a。唔係密碼學用途。 */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * 揀一句收束句。
 *
 * `seed` 應該係命盤嘅指紋（一本書一個）。
 * **唔准用 Math.random** —— C8b 嘅驗收標準係「同一 object 跑兩次輸出完全相同」，
 * 而且一本重排出嚟結尾唔同嘅書，讀者會覺得係我哋亂寫。
 */
export function pickClose(frames: Frame[], palace: string, seed: string): Frame {
  const bank = frames.filter((f) => f.kind === 'close' && f.palace === palace);
  if (bank.length === 0) throw new Error(`${palace} 冇收束句`);
  return bank[hash(`${seed}:${palace}`) % bank.length]!;
}

export function pickTransition(frames: Frame[], from: Slot, to: Slot, seed: string): Frame | null {
  const bank = frames.filter((f) => f.kind === 'transition' && f.from === from && f.to === to);
  if (bank.length === 0) return null;
  return bank[hash(`${seed}:${from}>${to}`) % bank.length]!;
}

export function openFrame(frames: Frame[], palace: string): Frame {
  const f = frames.find((x) => x.kind === 'open' && x.palace === palace);
  if (!f) throw new Error(`${palace} 冇開場導語`);
  return f;
}

/* ──────────────────────────────────────────────
   固定句：唔輪替嘅嗰幾句
   ────────────────────────────────────────────── */

/**
 * 內容系統 §5：疾厄章**章末必須**一句。
 * 呢句唔輪替 —— 換講法就會變成有時講得緊要啲、有時講得鬆啲。
 */
export const MEDICAL_DISCLAIMER = '此章不涉醫療判斷。';

/** 疾厄章章末嘅固定句；其餘宮冇。 */
export function chapterFooter(palace: string): string | null {
  return palace === '疾厄' ? MEDICAL_DISCLAIMER : null;
}

/**
 * 內容系統 §6：空宮**一定要明寫**。
 *
 * 「空宮本身就係訊息，照實講反而可信。」
 * 偷偷借對宮主星寫落去，讀者見到嗰一格係空嘅就會覺得我哋喺度作。
 */
export function emptyPalaceLine(palace: string, oppositeStars: string[]): string {
  if (oppositeStars.length === 0) return `此宮無主星，對宮亦無主星，兩宮同看。`;
  return `此宮無主星，借對宮${oppositeStars.join('、')}參看。`;
}

/* ──────────────────────────────────────────────
   過場白名單 —— AI 收尾檢查閘用
   ────────────────────────────────────────────── */

/**
 * 內容系統 §7 嘅檢查閘：「每句係咪追得返去某一塊；追唔到又唔喺過場白名單 → 剷走」。
 *
 * **呢個 bank 就係嗰個白名單。** 白名單唔係一個可以事後補嘅 list，
 * 佢必須等於我哋真係寫過嘅過場句 —— 否則「AI 只准生成過場句」就變成
 * 「AI 生成嘅句子我哋事後判佢係咪過場句」，而後者冇得驗。
 *
 * 所以 AI 收尾**唔准自己作過場句**，佢只可以由呢個 bank 揀。
 */
export function transitionWhitelist(frames: Frame[]): Set<string> {
  return new Set(frames.filter((f) => f.kind === 'transition').map((f) => f.text));
}

export function isTransition(frames: Frame[], sentence: string): boolean {
  return transitionWhitelist(frames).has(sentence.trim());
}

/* ──────────────────────────────────────────────
   反巴納姆
   ────────────────────────────────────────────── */

export type FramePair = { a: string; b: string; score: number };

/**
 * 收束句互相比對。
 *
 * 留白句只有二十幾三十字，而且句式本來就有限（「值得自己…」「可以留意的是…」），
 * 所以佢哋嘅相似度天生高過基塊 —— 門檻唔可以照抄 0.35。
 * 真正要捉嘅係**內容互換**：`close.財帛.1` 搬去官祿都讀得通，就係出事。
 * 錨詞閘負責呢一半，相似度負責另一半（同一宮入面四條唔可以係同一句嘅四個講法）。
 */
export function mostSimilarFrames(frames: Frame[], top = 10): FramePair[] {
  const cl = frames.filter((f) => f.kind === 'close');
  const out: FramePair[] = [];
  for (let i = 0; i < cl.length; i++) {
    for (let j = i + 1; j < cl.length; j++) {
      out.push({ a: cl[i]!.id, b: cl[j]!.id, score: similarity(cl[i]!.text, cl[j]!.text) });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, top);
}

export function frameCoverage(frames: Frame[]) {
  return {
    open: frames.filter((f) => f.kind === 'open').length,
    transition: frames.filter((f) => f.kind === 'transition').length,
    close: frames.filter((f) => f.kind === 'close').length,
    total: frames.length,
  };
}
