import { publicEnv } from '@/lib/env';
import { cronAuthorized, pingSupabase } from '@/lib/keepalive';

/** 每日一次，由 `vercel.json` 嘅 cron 叫。點解要咁做見 `lib/keepalive.ts`。 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('unauthorized', { status: 401 });
  }
  const result = await pingSupabase(publicEnv());
  return Response.json(result, {
    status: result.ok ? 200 : 502,
    headers: { 'cache-control': 'no-store' },
  });
}
