/**
 * 認領嘅邏輯（工單 G2 · 架構 §4）
 *
 * ── 點解要一個 port ──
 *
 * 認領本身係 Supabase Auth 嘅事（`linkIdentity` 會寄一封驗證信），
 * 而呢個環境接唔到一個真 instance。
 *
 * 所以呢個檔**唔識點樣叫 Supabase**：佢收一個 `IdentityPort`，
 * 做晒判斷同文案，測試用一個假 port 行。
 * 真嗰個 adapter 喺 `identity.server.ts`，得十幾行、零判斷。
 *
 * 邊幾行冇驗過，睇得一清二楚 —— 呢個就係分開嘅原因。
 */

export type Reader = { id: string; isAnonymous: boolean; email: string | null };

export type LinkFailure = 'taken' | 'invalid' | 'rate_limited' | 'unknown';

export type IdentityPort = {
  currentReader(): Promise<Reader | null>;
  /**
   * `redirectTo`：開咗驗證信條連結之後落喺邊（重新設計第二期）。
   * 冇畀就跟 Supabase 嘅 Site URL —— 即係首頁，冇晒 context。
   */
  linkEmail(
    email: string,
    redirectTo?: string,
  ): Promise<{ ok: true } | { ok: false; code: LinkFailure }>;
};

/** 認領失敗嘅原因。字喺 messages：`claim.errors.<code>`（`alreadyTo` 要埋 `email`）。 */
export type ClaimFailure = 'invalid' | 'noBooks' | 'already' | 'alreadyTo' | LinkFailure;

export type ClaimResult =
  | { ok: true; email: string }
  | { ok: false; code: ClaimFailure; email?: string };

/**
 * ⚠ 呢個唔係一條「完整」嘅 email 規則 —— 世上冇。
 *
 * 佢淨係擋住打錯字嗰種：冇 `@`、冇網域、有空格。
 * 真正嘅驗證係嗰封信寄唔寄得到 —— 所以呢度寧鬆莫緊，
 * 免得一個合法但奇怪嘅地址被我哋拒絕，而個人冇第二個方法認領。
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normaliseEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export async function claim(
  port: IdentityPort,
  raw: unknown,
  redirectTo?: string,
): Promise<ClaimResult> {
  const email = normaliseEmail(raw);

  if (!EMAIL.test(email)) {
    return { ok: false, code: 'invalid' };
  }

  const reader = await port.currentReader();

  /*
   * 冇 session = 呢部機同呢啲書之間冇任何關係。
   * 呢個位唔可以扮成功 —— 扮咗，個人會以為本書救返，
   * 而佢實際上係認領緊一個唔存在嘅人。
   */
  if (!reader) {
    return { ok: false, code: 'noBooks' };
  }

  /*
   * 已經認領咗就唔好再寄信。
   * ⚠ 呢個 return 要行喺 `linkEmail` 之前 —— 一個已經認領咗嘅人
   * 撳多次，唔應該收到一封信。
   */
  if (!reader.isAnonymous) {
    return reader.email ? { ok: false, code: 'alreadyTo', email: reader.email } : { ok: false, code: 'already' };
  }

  const linked = await port.linkEmail(email, redirectTo);
  if (linked.ok) return { ok: true, email };

  return { ok: false, code: linked.code };
}
