import { safeNext } from '@/lib/journey';

/**
 * 認領驗證信嘅落腳點（2026-09-29 · 付款前嘅缺口）
 *
 * 認領（`/claim`）行 `updateUser({ email })`，Supabase 寄一封確認信。
 * 讀者撳信入面條連結，Supabase 驗完就帶佢返嚟 —— 帶嘅係以下其中一樣：
 *
 *   ?code=…                    PKCE（@supabase/ssr 預設）→ 要 `exchangeCodeForSession`
 *   ?token_hash=…&type=…        自訂信件範本嘅寫法 → 要 `verifyOtp`
 *   （乜都冇）                  舊式 implicit，session 已經喺 cookie 度
 *
 * 之前冇一條 route 接住佢：連結帶住 `code` 落咗喺 `/pay/…`，冇人換 session，
 * 讀者喺 DB 度已經認領咗（trigger 郁咗 `readers.is_anonymous`），
 * 但佢手上個 session 仲係舊嘅匿名 JWT —— 付款頁照樣當佢未認領。
 *
 * 呢度淨係決定做乜；route（`app/api/auth/callback`）照住做。
 */
export type CallbackPlan =
  | { kind: 'code'; code: string; next: string }
  | { kind: 'otp'; tokenHash: string; type: OtpType; next: string }
  | { kind: 'refresh'; next: string };

export const OTP_TYPES = ['email_change', 'email', 'signup', 'magiclink', 'recovery', 'invite'] as const;
export type OtpType = (typeof OTP_TYPES)[number];

export function callbackPlan(params: URLSearchParams): CallbackPlan {
  const next = safeNext(params.get('next')) ?? '/shelf';
  const code = params.get('code');
  if (code) return { kind: 'code', code, next };
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash && type && (OTP_TYPES as readonly string[]).includes(type)) {
    return { kind: 'otp', tokenHash, type: type as OtpType, next };
  }
  return { kind: 'refresh', next };
}

/** 認領嗰陣畀 Supabase 嘅 `emailRedirectTo`：經 callback，再落返 `next`。 */
export function claimRedirect(origin: string, next: string): string {
  return `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
}
