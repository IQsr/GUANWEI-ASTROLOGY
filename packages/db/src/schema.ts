import { z } from 'zod';

/**
 * 六張表嘅列型別（工單 G1）
 *
 * ⚠ 呢度**唔係**第二份 schema。真正嘅 schema 喺 `migrations/*.sql` ——
 * 約束、外鍵、RLS 全部喺嗰度，而且喺嗰度先擋得住。
 *
 * 呢度做嘅係另一件事：app 由 Supabase 攞返嚟嘅 row 係 `any`，
 * 呢啲 schema 令佢變返有型別，順手喺入口再核一次。
 *
 * 兩份嘢一定會走音，所以 `test/schema.test.ts` 逐個欄對返 SQL ——
 * SQL 加咗欄而呢度冇加，就會爆。
 */

const uuid = z.uuid();
const ts = z.string();

export const ReaderRow = z.object({
  id: uuid,
  /** ⚠ 讀者自己寫唔到呢兩個欄 —— 由 `auth.users` 嘅 trigger 同步落嚟（G2）。 */
  is_anonymous: z.boolean(),
  email: z.email().nullable(),
  created_at: ts,
  /** 一日算一次。第二次回訪就係三個認領提示嘅中間嗰個（架構 §4）。 */
  visit_days: z.number().int().min(1),
  last_visit_on: z.string(),
  /** 「成書後」嗰個提示撳走咗冇。撳走咗就唔好再喺嗰個位嘈。 */
  claim_dismissed_at: ts.nullable(),
});

export const SubjectRow = z.object({
  id: uuid,
  reader_id: uuid,
  name: z.string().trim().min(1).max(40),
  birth_date: z.string(),
  /** null = 唔知時辰。冇時辰定唔到命宮 = 冇盤，但**書仍然存在**。 */
  birth_time: z.string().nullable(),
  birth_tz: z.string(),
  birth_place: z.string(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  sex: z.enum(['male', 'female']),
  true_solar_corrected: z.boolean(),
  created_at: ts,
});

/** 版本欄唔准 'latest'（規範 §17）。DB 有 CHECK，呢度再擋一次。 */
const pinned = z.string().min(1).refine((v) => v !== 'latest', {
  message: '版本欄唔可以係 latest —— 一本重現唔到嘅書唔係一本書',
});

export const ChartRow = z.object({
  id: uuid,
  subject_id: uuid,
  engine_version: pinned,
  school_profile_id: pinned,
  computed_at: ts,
  payload: z.unknown(),
});

export const BookRow = z.object({
  id: uuid,
  reader_id: uuid,
  /** 兩條都可以係 null —— 呢個就係「未題名」。 */
  subject_id: uuid.nullable(),
  chart_id: uuid.nullable(),
  title: z.string().nullable(),
  cover_seal: z.string().nullable(),
  last_read_chapter: z.string().nullable(),
  /** ⚠ 書架排序靠佢，唔靠 `created_at`（E3）。 */
  last_read_at: ts.nullable(),
  created_at: ts,
  titled_at: ts.nullable(),
  /**
   * ⚠ 防重送（G5）。同 `entitlements.stripe_payment_id` 一樣嘅角色：
   * 由 client 一開始生成，重試用返同一個，所以撳兩次「成書」
   * 攞返嘅係同一本書，唔係兩本一模一樣嘅書。
   */
  client_token: uuid.nullable(),
});

export const ChapterRow = z.object({
  id: uuid,
  book_id: uuid,
  slug: z.string(),
  ord: z.number().int(),
  tier: z.enum(['free', 'deep']),
  title: z.string(),
  /** ⚠ 未買嘅深度章攞唔到 —— 欄級權限收咗，要行 `chapter_body()`。 */
  body: z.string().nullable(),
  content_version: pinned,
  generated_at: ts,
  /**
   * ⚠ 裁開咗嘅時間（F4）。**唔係一個 UI flag。**
   *
   * 「裂開動畫一生只播一次」記喺 localStorage 嘅話，清 cookie 或者
   * 換部機就會再裂一次 —— 而一本已經裁開咗嘅書唔會自己癒合。
   */
  cut_at: ts.nullable(),
  /**
   * 每一段係邊一格（開場／結構／牽動／擾動／留白）。
   *
   * ⚠ 同 `body` 分開兩欄，因為**格嘅名唔係內容**：未買嘅人睇得到
   * 呢一版有幾多格、係乜嘢格，但讀唔到入面寫乜。咁先至係毛邊本。
   */
  slots: z.array(z.string()),
});

export const EntitlementRow = z.object({
  id: uuid,
  reader_id: uuid,
  book_id: uuid,
  product: z.string(),
  stripe_payment_id: z.string(),
  purchased_at: ts,
});

export const TABLES = {
  readers: ReaderRow,
  subjects: SubjectRow,
  charts: ChartRow,
  books: BookRow,
  chapters: ChapterRow,
  entitlements: EntitlementRow,
} as const;

export type Reader = z.infer<typeof ReaderRow>;
export type Subject = z.infer<typeof SubjectRow>;
export type Chart = z.infer<typeof ChartRow>;
export type Book = z.infer<typeof BookRow>;
export type Chapter = z.infer<typeof ChapterRow>;
export type Entitlement = z.infer<typeof EntitlementRow>;

/**
 * 一本書嘅三個狀態（架構 §8）。
 *
 * 由 row 算出嚟，唔係一個存落 DB 嘅欄 —— 存咗就會同 `chart_id`
 * 講唔同嘅嘢，而兩樣嘢講唔同說話嗰陣，冇人知邊樣啱。
 */
export type BookState = 'blank' | 'awaiting' | 'titled';

export function bookState(book: Pick<Book, 'subject_id' | 'chart_id'>): BookState {
  if (book.chart_id) return 'titled';
  return book.subject_id ? 'awaiting' : 'blank';
}
