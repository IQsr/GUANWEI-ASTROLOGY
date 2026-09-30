import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase.server';
import { callbackPlan } from '@/lib/auth-callback';

/**
 * 認領驗證信嘅落腳點。判斷喺 `lib/auth-callback.ts`（測過）。
 *
 * 擺喺 `/api` 底下：middleware 個 matcher 排走咗 `api`，
 * 唔會畀語言協商轉向 —— Supabase 帶返嚟嘅 query 一個都唔會唔見。
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const plan = callbackPlan(url.searchParams);
  const supabase = supabaseServer();

  const failed = () =>
    NextResponse.redirect(new URL(`/claim?link=failed&next=${encodeURIComponent(plan.next)}`, url.origin));

  if (plan.kind === 'failed') {
    console.error('[auth] 驗證連結帶住錯誤返嚟：' + (url.searchParams.get('error_code') ?? url.searchParams.get('error')));
    return failed();
  }

  try {
    if (plan.kind === 'code') {
      const { error } = await supabase.auth.exchangeCodeForSession(plan.code);
      if (error) throw error;
    } else if (plan.kind === 'otp') {
      const { error } = await supabase.auth.verifyOtp({ token_hash: plan.tokenHash, type: plan.type });
      if (error) throw error;
    }
    /*
     * ⚠ 換完都要 refresh 一次：email 確認咗之後，Supabase 將 `is_anonymous` 改做 false，
     * 但手上嗰張 JWT 係確認之前簽嘅。唔 refresh 嘅話，付款頁讀到嘅仲係「匿名」。
     */
    await supabase.auth.refreshSession();
  } catch (err) {
    /* 連結過期、用過一次、或者喺另一個瀏覽器開 —— 返去認領頁再寄一次 */
    console.error('[auth] 驗證連結換唔到 session：' + (err instanceof Error ? err.message : String(err)));
    return failed();
  }

  return NextResponse.redirect(new URL(plan.next, url.origin));
}
