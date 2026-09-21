/**
 * 「書」元件嘅狀態表（工單 E2）
 *
 * ── 五個狀態，三個形 ──
 *
 * 工單寫住五個狀態：架上書脊 → 封面 → 跨頁 → 合上題名 → 展開。
 * 但落手砌就見到：**「合上題名」同「封面」闊度一模一樣，
 * 「展開」同「跨頁」亦都一模一樣。**
 *
 * 分別唔喺幾何，喺入面塞咗乜：
 *
 *   封面 = 一本未寫過名嘅書　　　題名 = 同一本書，封面上面有你個名
 *   跨頁 = 落款嗰兩頁　　　　　　展開 = 命書正文嗰兩頁
 *
 * 呢個唔係重複，係第四條驗收標準（狀態同內容分開）自己講出嚟嘅嘢：
 * **「狀態」唔可以係「闊度」嘅同義詞。** 所以呢度兩張表分開 ——
 * 五個狀態名畀 E3–E6 用（佢哋各自要 hook 唔同嘅序列，
 * 例如 E5 嘅墨滲寫名就係掛喺 `titled` 上面），三個形畀 CSS 用。
 *
 * ── 點解闊度寫喺 CSS，唔寫喺呢度 ──
 *
 * 手機要收成單頁（第二條 AC），而嗰個判斷係 container query ——
 * 如果闊度由 TS 出 inline style，inline style 贏晒 media／container query，
 * 收唔到。所以數值喺 `globals.css`，呢度淨係記住**應該係邊三個值**，
 * 再由 `test/book.test.ts` 逐條對返 CSS。兩邊唔會走音。
 */

export const BOOK_STATES = ['spine', 'cover', 'spread', 'titled', 'open'] as const;
export type BookState = (typeof BOOK_STATES)[number];

export type BookShape = 'shelf' | 'closed' | 'opened';

export const SHAPE_OF: Record<BookState, BookShape> = {
  spine: 'shelf',
  cover: 'closed',
  spread: 'opened',
  titled: 'closed',
  open: 'opened',
};

/**
 * 三格由左至右：左頁 · 書脊 · 右頁。
 *
 * ⚠ 書脊喺**中間**，唔係最左。合埋嗰陣左頁闊度係零，
 * 書脊自然就企咗喺左邊 —— 同一本真書一樣，唔使兩套排法。
 */
export type BookGeometry = { verso: string; ji: string; recto: string };

export const GEOMETRY: Record<BookShape, BookGeometry> = {
  /* 架上：一條書脊，左邊露 3px 書口（視覺系統 §8）。 */
  shelf: { verso: 'var(--shu-kou)', ji: 'var(--shu-ji-jia)', recto: '0px' },
  /* 合上：書脊收成一條書口，右頁展開成封面。**「書轉過嚟面向你」就係呢一下。** */
  closed: { verso: '0px', ji: 'var(--shu-ji)', recto: 'var(--shu-ye)' },
  /* 打開：左頁由零長到一版闊。 */
  opened: { verso: 'var(--shu-ye)', ji: 'var(--shu-ji)', recto: 'var(--shu-ye)' },
};

/** 每個形用到邊幾格內容。`cover` 同 `page` 兩層都住喺右頁，互相淡入淡出。 */
export function slotsOf(shape: BookShape): { spine: boolean; cover: boolean; page: boolean } {
  return {
    spine: shape === 'shelf',
    cover: shape !== 'opened',
    page: shape === 'opened',
  };
}
