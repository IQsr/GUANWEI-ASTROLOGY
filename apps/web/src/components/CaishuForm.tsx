'use client';

import { useActionState } from 'react';
import { checkoutAction, type CheckoutState } from '@/app/[locale]/pay/[bookId]/actions';

/**
 * 裁書：一粒掣（工單 G3 · 視覺系統 §8）
 *
 * ⚠ 呢一版全站唯一准出現價錢嘅地方（架構 §6 硬規則），
 * 而個數由 server 帶落嚟 —— 呢個 component 自己唔識價錢。
 *
 * 一粒掣，冇「立即購買」、冇倒數、冇「限時」。
 * 同 F4 嗰課一樣：一個要人即刻決定嘅設計，係一個唔信自己本書嘅設計。
 */
export function CaishuForm({ bookId, priceLabel }: { bookId: string; priceLabel: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, null);

  return (
    <form action={action} className="mt-10">
      <input type="hidden" name="bookId" value={bookId} />

      <p className="text-lead tracking-[0.08em]">{priceLabel}</p>

      <button type="submit" disabled={pending} className="btn-mo mt-8">
        {pending ? '前　往　付　款' : '裁　開'}
      </button>

      {state ? (
        <p role="status" className="mt-6 text-sm leading-[1.9] text-cinnabar">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
