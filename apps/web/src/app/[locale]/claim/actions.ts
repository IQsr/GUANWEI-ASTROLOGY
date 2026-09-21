'use server';

import { claim } from '@/lib/identity';
import { serverIdentity } from '@/lib/identity.server';

export type ClaimState = { ok: boolean; message: string } | null;

/**
 * 認領（工單 G2）
 *
 * 判斷同文案喺 `lib/identity.ts`（測過），接 Supabase 喺
 * `lib/identity.server.ts`（冇跑過，但冇判斷）。呢度淨係接返一齊。
 */
export async function claimAction(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  try {
    const result = await claim(serverIdentity(), formData.get('email'));
    return result.ok
      ? {
          ok: true,
          message: `驗證信已經寄去 ${result.email}。開了信裡的連結，這些書就記在你名下。`,
        }
      : { ok: false, message: result.message };
  } catch (error) {
    /*
     * 行到呢度即係我哋自己壞咗（多數係環境變數）。
     * 真錯誤記落 server log；出畀讀者嗰句唔會扮成功，
     * 但亦都唔會將一個佢幫唔到手嘅技術原因掟畀佢。
     */
    console.error('[claim] ', error);
    return { ok: false, message: '暫時寄不出驗證信。請稍後再試一次。' };
  }
}
