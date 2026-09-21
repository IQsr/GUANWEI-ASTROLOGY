'use client';

import { useActionState } from 'react';
import { claimAction, type ClaimState } from '@/app/[locale]/claim/actions';

/**
 * 認領表（工單 G2 · 視覺系統 §8）
 *
 * 一欄、一粒掣。落款欄行 `.ruled`：淨係一條底線，
 * focus 嗰陣朱砂由左掃過 —— 朱砂喺呢度係「而家輪到呢一欄」。
 */
export function ClaimForm() {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimAction, null);

  return (
    <form action={action} className="mt-10 max-w-96">
      <label htmlFor="claim-email" className="block font-sans text-cap tracking-[0.16em] text-ink-3">
        電　郵
      </label>
      <input
        id="claim-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={pending}
        className="ruled mt-3"
        aria-describedby={state ? 'claim-msg' : undefined}
      />

      <button type="submit" disabled={pending} className="btn-mo mt-10">
        {pending ? '寄　出　中' : '認　領'}
      </button>

      {state ? (
        <p
          id="claim-msg"
          role="status"
          className={`mt-6 text-sm leading-[1.9] ${state.ok ? 'text-ink-2' : 'text-cinnabar'}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
