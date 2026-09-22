'use server';

import { canDelete, exportFilename, DELETE_COPY, EXPORT_NOTE } from '@/lib/account';
import { deleteAccount, exportData } from '@/lib/account.server';

export type ExportState = { ok: true; filename: string; json: string } | { ok: false; message: string } | null;
export type DeleteState = { ok: boolean; message: string } | null;

/**
 * 匯出（工單 G4 · GDPR Art. 15、20）
 *
 * ⚠ 個檔由 server 砌好一次過交落去，唔係畀 client 自己撈。
 *
 * 一個「client 自己 query 晒」嘅做法會令匯出行一條同 `export_reader()`
 * 唔同嘅路 —— 而嗰條路就係 paywall 繞路出現嘅地方。
 */
export async function exportAction(): Promise<ExportState> {
  try {
    const data = await exportData();
    const payload = { note: EXPORT_NOTE, ...(data as Record<string, unknown>) };
    return {
      ok: true,
      filename: exportFilename(new Date()),
      json: JSON.stringify(payload, null, 2),
    };
  } catch (error) {
    console.error('[account] export', error);
    return { ok: false, message: '暫時匯出不了。請稍後再試一次。' };
  }
}

/**
 * 真刪（工單 G4 · GDPR Art. 17 · 架構 §10）
 *
 * ⚠ 打字確認喺呢度**再查一次**。
 *
 * server action 係公開 HTTP endpoint（E4 嗰課）。一個只喺版面
 * disable 粒掣嘅確認，用 curl 直接 POST 就繞得過 ——
 * 而呢個動作冇得返轉頭。
 */
export async function deleteAction(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const typed = String(formData.get('confirm') ?? '');
  if (!canDelete(typed)) {
    return { ok: false, message: '要照著打那兩個字，才會真的刪除。' };
  }

  const outcome = await deleteAccount();
  return { ok: outcome.state === 'gone', message: DELETE_COPY[outcome.state] };
}
