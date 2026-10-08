import { notFound } from 'next/navigation';
import { tokensEnabled } from '@/lib/tokens-gate';

/* 每次 request 先決定（見 `tokens-gate.ts`）—— 唔可以喺 build 嗰陣定死 */
export const dynamic = 'force-dynamic';

export default function TokensLayout({ children }: { children: React.ReactNode }) {
  if (!tokensEnabled()) notFound();
  return children;
}
