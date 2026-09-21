import 'server-only';
import { supabaseServer as client } from '@/lib/supabase.server';
import type { IdentityPort, LinkFailure } from '@/lib/identity';

/**
 * 真嘅 adapter（工單 G2）
 *
 * ⚠ **呢個檔冇跑過。** 呢個環境接唔到一個真 Supabase instance，
 * 所以佢係全個 repo 入面唯一一段「睇落啱」而唔係「驗過啱」嘅嘢。
 *
 * 所以佢寫到冇判斷可言：攞 session、叫 `linkIdentity`、
 * 將錯誤碼翻做我哋自己嗰四個。所有判斷同文案喺 `identity.ts`，
 * 嗰邊用假 port 測過。
 *
 * 亦都因為咁，佢短 —— 短到可以逐行讀一次就知有冇錯。
 */

function failureOf(status: number | undefined, message: string): LinkFailure {
  if (status === 429) return 'rate_limited';
  if (status === 422 || /already|exists|registered/i.test(message)) return 'taken';
  if (status === 400) return 'invalid';
  return 'unknown';
}

export function serverIdentity(): IdentityPort {
  return {
    async currentReader() {
      const { data, error } = await client().auth.getUser();
      if (error || !data.user) return null;
      return {
        id: data.user.id,
        isAnonymous: data.user.is_anonymous ?? false,
        email: data.user.email ?? null,
      };
    },

    async linkEmail(email) {
      /*
       * ⚠ 架構 §5 寫「認領 = `linkIdentity` 加 email」。
       * 實際上 `linkIdentity` 係用嚟接 OAuth 供應商嘅；
       * 匿名 user 加 email 要行 `updateUser({ email })`，
       * 跟住 Supabase 會寄一封驗證信，確認咗先變 permanent。
       *
       * 兩個 API 嘅重點係一樣嘅、亦都係我哋要嗰樣：
       * **佢哋都唔會換咗個 user。** `auth.uid()` 唔變，
       * 所以書同票一件都唔使搬（§5：「唔好自己捲 cookie 之後搬資料」）。
       */
      const { error } = await client().auth.updateUser({ email });
      if (!error) return { ok: true as const };
      return { ok: false as const, code: failureOf(error.status, error.message) };
    },
  };
}
