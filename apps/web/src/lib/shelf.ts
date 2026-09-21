/**
 * 書架（工單 E3 · 視覺系統 §8 · 架構 §4）
 *
 * ── 書架唔係一個列表 ──
 *
 * 架構 §4：「`/shelf` 係第二本書嘅起點，唔係首頁；
 * **永遠有一條虛線書脊「＋ 新書」**。」
 *
 * 所以呢度做嘅係由一堆 row 砌出**一排書脊**，而唔係「render 個 array」：
 * 次序有意思、有一格永遠喺度、有一本會着朱砂。
 */

export type BookState = 'blank' | 'awaiting' | 'titled';

export type ShelfBook = {
  id: string;
  state: BookState;
  /** 盤主嘅名。`blank` 冇。 */
  name: string | null;
  /** ISO 時間。未讀過就係 null。 */
  lastReadAt: string | null;
  createdAt: string;
};

export type Spine = {
  key: string;
  label: string;
  /** `new` 嗰條去 `/cast`，其餘去本書。 */
  href: string;
  kind: 'titled' | 'awaiting' | 'new';
  /** 在讀嗰本。全排最多一本。 */
  reading: boolean;
};

/** 排序用嘅時間：讀過就用讀嘅時間，未讀過就用開書嘅時間。 */
function at(book: ShelfBook): number {
  return Date.parse(book.lastReadAt ?? book.createdAt);
}

export function shelf(books: ShelfBook[]): Spine[] {
  /*
   * ⚠ `blank` 唔畫。
   *
   * 一本乜都冇寫過嘅書，同一格空位係同一樣嘢 —— 佢冇名、冇盤、
   * 冇任何可以叫人認得返佢嘅嘢。畫咗出嚟，讀者見到嘅係兩條一模一樣
   * 嘅虛線書脊，而佢分唔出邊條係「上次撳完冇寫」，邊條係「＋ 新書」。
   *
   * 所以「未題名」喺書架上面唔係一條書脊，**係嗰格空位本身**。
   * （六幕流程入面佢仍然係一行真 row —— 落款嗰陣本書要存在。）
   */
  const shown = books.filter((b) => b.state !== 'blank');

  /* 最近讀嗰本喺最左。 */
  const sorted = [...shown].sort((a, b) => at(b) - at(a));

  /*
   * 「在讀」= 最近讀過嗰本，唔係「最左嗰本」。
   * 一個從來未開過任何一本書嘅人，書架上面唔應該有一本着咗朱砂。
   */
  const read = sorted.filter((b) => b.lastReadAt !== null);
  const readingId = read.length ? read[0]!.id : null;

  const spines: Spine[] = sorted.map((b) => ({
    key: b.id,
    label: b.name ?? '未題名',
    href: `/book/${b.id}`,
    kind: b.state === 'titled' ? 'titled' : 'awaiting',
    reading: b.id === readingId,
  }));

  /* 永遠喺最右。空書架就淨係得佢一條。 */
  spines.push({ key: 'new', label: '＋ 新書', href: '/cast', kind: 'new', reading: false });

  return spines;
}

/** 書架係咪空 —— 即係得嗰條「＋ 新書」。 */
export function isEmptyShelf(spines: Spine[]): boolean {
  return spines.length === 1 && spines[0]!.kind === 'new';
}

/* ────────────────────────────────────────────────────────────
   書架一版睇到嘅嘢
   ──────────────────────────────────────────────────────────── */

import { claimPromptFor, type ClaimPrompt } from '@/lib/claim';

export type ShelfReader = {
  isAnonymous: boolean;
  /** 一日算一次（DB 嘅 `touch_visit()`）。 */
  visitDays: number;
  /** 「成書後」嗰個認領提示撳走咗未。 */
  dismissed: boolean;
};

export type ShelfPort = {
  /** 未有 session 就回 null —— 匿名登入要等到佢真係攞書落嚟先做。 */
  reader(): Promise<ShelfReader | null>;
  books(): Promise<ShelfBook[]>;
};

export type ShelfView =
  | { kind: 'ok'; spines: Spine[]; prompt: ClaimPrompt | null }
  /**
   * ⚠ 撈唔到。
   *
   * 呢個狀態要同「你冇書」分得清清楚楚。
   * 一個喺 DB 撈唔到嗰陣顯示「空書架」嘅版，等於同一個回訪嘅人講
   * 「你啲書冇咗」—— 而佢啲書其實好地地。
   *
   * **一個掉咗你啲書嘅書架，比一個講明而家壞咗嘅書架差好多。**
   * 所以呢個狀態亦都唔會出「＋ 新書」：撈唔到你有幾多本書嗰陣，
   * 唔應該請你開多一本。
   */
  | { kind: 'unavailable' };

export async function shelfView(port: ShelfPort): Promise<ShelfView> {
  let reader: ShelfReader | null;
  let books: ShelfBook[];

  try {
    reader = await port.reader();
    /* 未有 session = 一個從來未嚟過嘅人。空書架係啱嘅答案。 */
    books = reader ? await port.books() : [];
  } catch {
    return { kind: 'unavailable' };
  }

  return {
    kind: 'ok',
    spines: shelf(books),
    prompt: reader
      ? claimPromptFor('shelf', {
          isAnonymous: reader.isAnonymous,
          visitDays: reader.visitDays,
          dismissed: reader.dismissed,
        })
      : null,
  };
}
