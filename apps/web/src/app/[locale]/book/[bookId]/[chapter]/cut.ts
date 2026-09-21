'use server';

import { supabaseServer } from '@/lib/supabase.server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 裁開一版（工單 F4 · migration 0006）
 *
 * ⚠ 「一生只播一次」係呢句 rpc 答嘅，唔係 client 記住嘅。
 *
 * 回 `true` 就係**今次先裁開**（即係要播嗰一千六百毫秒）；
 * 已經裁咗、未買、唔係你本書，一律 `false`。
 *
 * ⚠ 錯咗一律當「唔使播」。
 * 一版買咗嘅書睇唔睇到字，同播唔播動畫係兩件事 ——
 * 而動畫嗰件事出錯，唔應該令你睇唔到自己買咗嘅字。
 */
export async function cutPage(chapterId: string): Promise<boolean> {
  if (!UUID.test(chapterId)) return false;
  try {
    const { data, error } = await supabaseServer().rpc('cut_page', { p_chapter: chapterId });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
