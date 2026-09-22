/**
 * 設定：匯出、重排、真刪（工單 G4 · 架構 §10 · docs/rules.md R-008）
 *
 * ── 呢個檔冇 import 過 Supabase ──
 *
 * 同 `identity.ts`、`pay.ts` 一樣嘅分法：判斷同文案喺呢度（測得到），
 * 接 API 喺 `account.server.ts`（冇跑過，但冇判斷）。
 */

import { drift, pinnedOf, type Drift, type Pinned } from '@/lib/chongpai';

/* ───────────────────────────────────────────────────────────
 * 匯出
 * ─────────────────────────────────────────────────────────── */

/**
 * ⚠ 匯出檔個名唔准帶生辰、唔准帶姓名。
 *
 * 一個叫 `思協-1996-06-16.json` 嘅檔會出現喺下載夾、出現喺
 * 「最近檔案」、出現喺佢下次分享畫面嗰陣嘅檔案揀選器 ——
 * 三個我哋控制唔到嘅地方，而每一個都會畀第二個人見到。
 *
 * 日期用當日就夠：佢自己知道係邊份。
 */
export function exportFilename(today: Date): string {
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, '0');
  const d = String(today.getUTCDate()).padStart(2, '0');
  return `guanwei-${y}${m}${d}.json`;
}

/**
 * ⚠ 匯出檔要講得出自己入面**冇**乜。
 *
 * 一份 JSON 入面有啲章嘅 `body` 係 `null`，如果冇解釋，讀落就似
 * 我哋漏咗嘢或者整爛咗。實情係嗰幾章未買 —— 而嗰個係一個事實，
 * 唔係一個要收埋嘅嘢。
 */
export const EXPORT_NOTE =
  '未裁開的深度章，body 是 null —— 那幾章還沒有購買，不是這份檔案缺了東西。';

/* ───────────────────────────────────────────────────────────
 * 重排（R-008）
 * ─────────────────────────────────────────────────────────── */

export type BookVersions = {
  bookId: string;
  title: string | null;
  pinned: Pinned | null;
};

export type RecastRow = {
  bookId: string;
  title: string;
  /** 空陣列 = 呢本書同而家一樣。 */
  drift: Drift[];
  /** 講唔出自己係邊一版排嘅 —— 一個要修嘅資料問題，唔係一個好消息。 */
  unknown: boolean;
  /**
   * ⚠ 鎖死咗嗰三個值帶埋出嚟，唔好要版面自己再 `pinnedOf()` 一次。
   * 一樣嘢喺兩個地方各算一次，就係兩個總有一日會講唔同嘢嘅地方。
   */
  pinned: Pinned | null;
};

/**
 * 逐本書同而家嘅設定比一比。
 *
 * ⚠ 呢度**冇**一個叫 `recast()` 嘅 function，同 `chongpai.ts` 一樣理由。
 * R-008：舊盤唔自動重算。呢一層淨係識講「差咗乜」。
 */
export function recastRows(books: BookVersions[], current: Pinned): RecastRow[] {
  return books.map((b) => {
    const pinned = pinnedOf(b.pinned);
    return {
      bookId: b.bookId,
      title: b.title ?? '未題名',
      drift: pinned ? drift(pinned, current) : [],
      unknown: pinned === null,
      pinned,
    };
  });
}

/**
 * ⚠ 重排係造一本**新書**，唔係改舊嗰本（R-008 第三條配套）。
 *
 * 所以呢度回嘅係「去邊度開一本新書」，唔係「改邊本書」。
 * 舊嗰本要仲喺度 —— 否則「唔自動改」只係將同一件事推遲咗一下。
 *
 * 帶住 `from` 係為咗落款嗰邊預先填返同一個生辰：重排唔應該要人
 * 由頭再打一次五步。但佢**係一條新嘅落款**，唔係一個編輯畫面。
 */
export function recastHref(bookId: string): string {
  return `/cast?from=${encodeURIComponent(bookId)}`;
}

export const RECAST_COPY = {
  none: '這本書用的設定和現在一樣。',
  unknown: '這本書沒有記下自己是哪一版排的 —— 這是我們要修的資料問題，不是「和現在一樣」。',
  /*
   * ⚠ 呢句要同時講三件事：舊嗰本唔會變、新嗰本係另一本、兩本都留低。
   * 少講任何一件，「由用戶揀」就變成「撳一下換咗佢」。
   */
  action:
    '想看新版本排出來是甚麼樣子，可以照同一個生辰再排一本。這一本不會變，兩本都會留在書齋，由你對照。',
} as const;

/* ───────────────────────────────────────────────────────────
 * 真刪
 * ─────────────────────────────────────────────────────────── */

/** `delete_reader()` 回嘅數。 */
export type DeleteCounts = {
  subjects: number;
  books: number;
  chapters: number;
  entitlements: number;
};

/**
 * ⚠ 刪除要打字先做得到，唔係撳一下。
 *
 * 唔係為咗嚇人 —— 係因為呢個動作**真係冇得返轉頭**（架構 §10：真刪）。
 * 一個「你確定嗎？」對話框，喺一個已經撳咗一下嘅人面前，
 * 基本上係一個要撳多一下嘅掣。
 *
 * 打兩個字唔會令佢改變主意，但會令佢**知道自己而家做緊乜**。
 */
export const DELETE_PHRASE = '刪除';

export function canDelete(typed: string): boolean {
  return typed.trim() === DELETE_PHRASE;
}

/**
 * ⚠ 刪之前要講清楚：邊樣真係冇咗，邊樣留低。
 *
 * 一句「我哋會刪除你所有資料」而實際上留咗一行，就係一句大話
 * （`docs/privacy.md` 第五節）。所以呢兩張表寫喺 code 度，
 * 而唔係散喺版面嘅文案入面。
 */
export const DELETE_REMOVES = [
  '你寫過的每一個生辰（姓名、日期、時辰、出生地）',
  '每一張排出來的盤',
  '每一本書，連已經裁開的深度章正文',
  '購買記錄和你的帳戶之間的關聯',
] as const;

export const DELETE_KEEPS = [
  /*
   * ⚠ 呢一行唔可以含糊。
   *
   * 留低嘅係一筆數：金額、貨幣、日期、Stripe 個交易編號。
   * 佢認唔返邊個畀嘅 —— 冇 reader_id、冇 book_id、冇 email。
   */
  '一筆不連到任何人的付款記錄（金額、日期、Stripe 交易編號）—— 會計法規要求保留',
] as const;

export type DeleteOutcome =
  | { state: 'gone'; counts: DeleteCounts }
  /** ⚠ 資料刪咗，但 auth 帳戶未刪得切 —— 剩返個 email。 */
  | { state: 'partial'; counts: DeleteCounts }
  | { state: 'failed' };

/**
 * ⚠ 「刪咗」同「刪咗一半」唔可以講同一句。
 *
 * 真刪實際上係兩步：DB 嗰邊 `delete_reader()`（生辰、盤、書全部跟
 * cascade 走），然後 auth 嗰邊 `admin.deleteUser`（個 email）。
 * 第二步要 service_role，而佢可以仆街。
 *
 * 仆咗街嘅話，個人手上剩低嘅係一個冇任何資料嘅帳戶 ——
 * 報「已經全部刪除」就係一句大話，而嗰句大話嘅代價係
 * 佢以為自己個 email 冇咗，實情係仲喺度。
 */
export const DELETE_COPY: Record<DeleteOutcome['state'], string> = {
  gone: '全部刪除了。這個帳戶和它的內容都不存在了。',
  partial:
    '生辰、盤和書都刪除了，但帳戶本身（你的電郵）刪不掉。這一步要我們這邊處理 —— 請來信告訴我們，我們會補做。',
  failed: '暫時刪不了。沒有任何東西被刪除 —— 請稍後再試一次。',
};

/** 刪完之後個人應該去邊。⚠ 唔係書齋 —— 嗰度已經冇嘢。 */
export const DELETE_DONE_HREF = '/';
