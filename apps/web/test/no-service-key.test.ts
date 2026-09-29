import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 網站唔再攞 service role key（2026-09-29 · migration 0010）
 *
 * 佢 bypass 晒 RLS：外洩一次，全部讀者嘅生辰、盤、書都讀得到。
 * 付款改用 `pay_grant` / `pay_revoke` ＋ PAY_WEBHOOK_TOKEN，刪帳戶改用 `delete_my_auth_user()`。
 * 呢度守住冇人喺 src 度再攞返佢，或者再用 admin API。
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe('網站唔攞 service role key', () => {
  it('src 入面冇 SUPABASE_SERVICE_ROLE_KEY、冇 auth.admin', () => {
    const bad = files('src').filter((f) => {
      const code = readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
        .join('\n');
      return /SUPABASE_SERVICE_ROLE_KEY|auth\.admin|serviceKey\(/.test(code);
    });
    expect(bad).toEqual([]);
  });
});
