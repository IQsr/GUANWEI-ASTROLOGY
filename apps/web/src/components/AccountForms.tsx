'use client';

import { useActionState, useState } from 'react';
import {
  deleteAction,
  exportAction,
  type DeleteState,
  type ExportState,
} from '@/app/[locale]/account/actions';
import { DELETE_PHRASE, canDelete } from '@/lib/account';

/**
 * 匯出（工單 G4）
 *
 * ⚠ 個檔由 server action 砌好，呢度淨係負責「畀佢落到機」。
 * 冇任何 query 喺 client 度行 —— 否則匯出就會有第二條路，
 * 而第二條路就係 paywall 繞路出現嘅地方。
 */
export function ExportButton() {
  const [state, action, pending] = useActionState<ExportState, FormData>(
    async () => {
      const result = await exportAction();
      if (result?.ok) {
        /* Blob → 一個一次性嘅本機連結。份嘢冇經過第三方。 */
        const url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      return result;
    },
    null,
  );

  return (
    <form action={action} className="mt-8">
      <button type="submit" disabled={pending} className="btn-mo">
        {pending ? '整　理　中' : '下　載'}
      </button>
      {state && !state.ok ? (
        <p role="status" className="mt-6 text-sm leading-[1.9] text-cinnabar">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * 刪除（工單 G4 · 架構 §10）
 *
 * ⚠ 要打字先做得到，唔係撳一下。
 *
 * 唔係為咗嚇人 —— 係因為呢個動作真係冇得返轉頭。
 * 一個「你確定嗎？」對話框，喺一個已經撳咗一下嘅人面前，
 * 基本上係一個要撳多一下嘅掣。打兩個字唔會令佢改變主意，
 * 但會令佢知道自己而家做緊乜。
 *
 * ⚠ 而且粒掣 disable 咗**唔算數** —— server action 嗰邊再查一次。
 */
export function DeleteForm() {
  const [typed, setTyped] = useState('');
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAction, null);

  return (
    <form action={action} className="mt-8 max-w-96">
      <label htmlFor="confirm" className="block font-sans text-cap tracking-[0.16em] text-ink-3">
        打「{DELETE_PHRASE}」兩個字
      </label>
      <input
        id="confirm"
        name="confirm"
        type="text"
        autoComplete="off"
        disabled={pending}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="ruled mt-3"
      />

      <button
        type="submit"
        disabled={pending || !canDelete(typed)}
        className="btn-mo mt-10 disabled:opacity-30"
      >
        {pending ? '刪　除　中' : '刪　除'}
      </button>

      {state ? (
        <p
          role="status"
          className={`mt-6 text-sm leading-[1.9] ${state.ok ? 'text-ink-2' : 'text-cinnabar'}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
