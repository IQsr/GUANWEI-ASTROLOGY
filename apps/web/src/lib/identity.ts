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
  linkEmail(email: string): Promise<{ ok: true } | { ok: false; code: LinkFailure }>;
};

export type ClaimResult = { ok: true; email: string } | { ok: false; message: string };

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

export async function claim(port: IdentityPort, raw: unknown): Promise<ClaimResult> {
  const email = normaliseEmail(raw);

  if (!EMAIL.test(email)) {
    return { ok: false, message: '這個電郵地址看來不完整，請再看一次。' };
  }

  const reader = await port.currentReader();

  /*
   * 冇 session = 呢部機同呢啲書之間冇任何關係。
   * 呢個位唔可以扮成功 —— 扮咗，個人會以為本書救返，
   * 而佢實際上係認領緊一個唔存在嘅人。
   */
  if (!reader) {
    return { ok: false, message: '這個瀏覽器沒有書。如果書在另一部裝置上，請在那邊認領。' };
  }

  /*
   * 已經認領咗就唔好再寄信。
   * ⚠ 呢個 return 要行喺 `linkEmail` 之前 —— 一個已經認領咗嘅人
   * 撳多次，唔應該收到一封信。
   */
  if (!reader.isAnonymous) {
    return {
      ok: false,
      message: reader.email
        ? `這些書已經屬於 ${reader.email}。`
        : '這些書已經認領過了。',
    };
  }

  const linked = await port.linkEmail(email);
  if (linked.ok) return { ok: true, email };

  const MESSAGES: Record<LinkFailure, string> = {
    taken: '這個電郵已經有另一個帳號。請在那個帳號登入，或者換一個電郵。',
    invalid: '這個電郵地址看來不完整，請再看一次。',
    rate_limited: '剛才已經寄過一封，請等幾分鐘再試。',
    unknown: '暫時寄不出驗證信。請稍後再試一次。',
  };
  return { ok: false, message: MESSAGES[linked.code] };
}
