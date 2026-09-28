'use server';

import { getTranslations } from 'next-intl/server';
import { shelf } from '@/lib/shelf';
import { serverShelf } from '@/lib/shelf.server';
import { resumeFrom } from '@/lib/journey';

/**
 * 首頁「續讀」（重新設計第二期）
 *
 * ⚠ 淨係叫 `books()`，唔叫 `reader()`。
 *
 * `reader()` 會記一次回訪（`touch_visit`），而認領提示係靠回訪日數
 * 決定幾時出（G2）。首頁每次都叫佢，就等於改咗嗰條提示嘅時間表。
 * `books()` 行 RLS：冇 session 就係空，唔會開匿名 user。
 *
 * 撈唔到就當冇 —— 首頁唔應該因為 DB 壞咗而少咗「起盤」。
 */
export async function resumeAction(): Promise<{ href: string; label: string } | null> {
  try {
    const t = await getTranslations('shelf');
    return resumeFrom(shelf(await serverShelf().books(), { untitled: t('untitled'), newBook: t('newBook') }));
  } catch {
    return null;
  }
}
