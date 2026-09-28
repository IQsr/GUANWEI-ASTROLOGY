/**
 * 路線：頁與頁之間帶住乜（重新設計第二期）
 *
 * ── 點解要一個檔 ──
 *
 * 之前每一版都講得清自己，但冇一版知道你**由邊度嚟、下一步去邊**：
 *
 *   未裁章 → 認領 → 付款 → Stripe → 「回書齋」
 *
 * 行完成條路，返唔到你想開嗰一章。呢度將「嗰一章」變成一個
 * 跟住條路行嘅參數，同埋將四步（落款 → 取書 → 閱讀 → 深讀）
 * 寫成一張表，每一版都講得出自己喺第幾步。
 *
 * 全部係純函數 —— `test/journey.test.ts` 逐條測。
 */

/* ── 四步 ─────────────────────────────────────────────── */

/** 四步。名喺 messages（`journey.s1`–`s4`）。 */
export const STEPS = [1, 2, 3, 4] as const;

export type StepN = (typeof STEPS)[number];

/* ── 返去邊：只准站內路徑 ──────────────────────────────── */

/**
 * 一個由網址帶入嚟嘅「返去邊」，只准係站內路徑。
 *
 * ⚠ 呢個唔係潔癖。`/claim?next=https://evil.example` 如果照跳，
 * 我哋就係一個幫人扮觀微嘅轉址器 —— 條連結由我哋個 domain 開頭，
 * 睇落完全可信。所以：
 *
 *   一、一定要 `/` 開頭
 *   二、唔准 `//` 或者 `/\` 開頭（瀏覽器當佢係另一個 host）
 *   三、唔准有控制字元（`\t` `\n` 會被瀏覽器食咗，拼出 `//`）
 *
 * 唔啱就當冇帶 —— 最多係返書齋，唔係報錯。
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}

/* ── 一章 ─────────────────────────────────────────────── */

/**
 * 一章嘅網址。
 *
 * ⚠ 路徑入面嘅中文**唔喺呢度 encode** —— `<Link>` 同瀏覽器會自己做，
 * 目次一直都係噉寫。喺度 encode 一次再畀 `<Link>` 就可能變兩次。
 * 放入 query（`?ch=`、`?next=`）嗰陣先 encode，嗰度係我哋自己砌字串。
 */
export function chapterHref(bookId: string, slug: string): string {
  return `/book/${bookId}/${slug}`;
}

/**
 * 路由參數入面嘅章名。
 *
 * 交接文件記住一個未證實嘅疑點：`chapter` 參數同 `slug` 對唔上，
 * 因為中文經咗 URL encode。無論 Next 畀嘅係 encode 咗定未，
 * 喺度解一次就兩種都啱 —— 章名本身冇 `%`，所以解多一次唔會解錯。
 */
export function chapterParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** 目次。 */
export function contentsHref(bookId: string): string {
  return `/book/${bookId}`;
}

/** 付款頁，帶住「由邊一章嚟」。 */
export function payHref(bookId: string, slug?: string | null): string {
  return slug ? `/pay/${bookId}?ch=${encodeURIComponent(slug)}` : `/pay/${bookId}`;
}

/**
 * 認領頁，帶住認領完去邊（`next`）同「唔住住」嘅話返去邊（`from`）。
 *
 * 兩個分開：`next` 係付款頁（認領咗先裁得），`from` 係你讀緊嗰一章。
 * 撳返回唔應該去付款頁 —— 你未認領，去到只會被擋返嚟。
 */
export function claimHref(opts: { next?: string | null; from?: string | null } = {}): string {
  const q = new URLSearchParams();
  if (opts.next) q.set('next', opts.next);
  if (opts.from) q.set('from', opts.from);
  const s = q.toString();
  return s ? `/claim?${s}` : '/claim';
}

/**
 * 未裁章嗰粒「裁開」去邊。
 *
 * 匿名就去認領，認領咗先去付款（架構 §4 硬閘）—— 同之前一樣，
 * 只係而家兩條路都記住「嗰一章」。
 */
export function cutHref(bookId: string, slug: string, isAnonymous: boolean): string {
  const pay = payHref(bookId, slug);
  return isAnonymous ? claimHref({ next: pay, from: chapterHref(bookId, slug) }) : pay;
}

/**
 * 由網址或者表單帶入嚟嘅章名（`?ch=`）。
 *
 * 佢最後會砌入 Stripe 嘅 success_url 同我哋自己嘅連結，所以只收
 * 一個「似章名」嘅字串：唔准斜線、唔准控制字元、唔准長過 40 字。
 * 唔啱就當冇帶 —— 返目次，唔係報錯。
 */
export function safeSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s.length > 40) return null;
  if (/[/\\?#%\u0000-\u001f\u007f]/.test(s)) return null;
  return s;
}

/* ── 上一章／下一章 ───────────────────────────────────── */

export type ChapterLink = { slug: string; title: string; tier: string };

/**
 * 一章嘅前後。按目次次序（`ord`），唔係按 slug。
 *
 * ⚠ 下一章係未裁章都照樣出 —— 目次入面佢本來就喺度（架構 §6），
 * 讀到呢度就知下一章係乜，撳入去見到嘅係一版未裁嘅紙，唔係一個錯誤。
 */
export function neighbours<T extends ChapterLink & { ord: number }>(
  chapters: readonly T[],
  slug: string,
): { prev: T | null; next: T | null } {
  const sorted = [...chapters].sort((a, b) => a.ord - b.ord);
  const i = sorted.findIndex((c) => c.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: sorted[i - 1] ?? null, next: sorted[i + 1] ?? null };
}

/* ── 讀緊邊一章（畀藏經閣「回到正文」用）──────────────── */

export type Reading = { href: string; title: string };

/** 由 sessionStorage 讀返嚟嘅嘢要驗 —— 嗰度任何 script 都寫得落。 */
export function parseReading(raw: string | null): Reading | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return null;
    const { href, title } = v as Record<string, unknown>;
    const safe = safeNext(href);
    if (!safe || !safe.startsWith('/book/') || typeof title !== 'string' || !title) return null;
    return { href: safe, title: title.slice(0, 40) };
  } catch {
    return null;
  }
}

/* ── 首頁「續讀」──────────────────────────────────────── */

/**
 * 首頁嗰行「續讀」去邊：在讀嗰本；冇讀過就最近開嗰本已成書嘅。
 * 一本都冇（或者只得「＋ 新書」）就冇呢行。
 *
 * ⚠ 待時辰嗰啲唔算 —— 佢哋未成書，冇嘢續讀。
 */
export function resumeFrom(
  spines: readonly { href: string; label: string; kind: string; reading: boolean }[],
): { href: string; label: string } | null {
  const pick = spines.find((s) => s.reading) ?? spines.find((s) => s.kind === 'titled');
  return pick ? { href: pick.href, label: pick.label } : null;
}
