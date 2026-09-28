import { slotsFor } from '@/lib/slots.server';

/**
 * 時辰選項（落款第四步）：呢一日、呢個出生地，每個時辰對應鐘面幾點到幾點。
 *
 * ⚠ POST，唔係 GET：出生日期唔准入網址（`check-privacy` 量住「生辰冇入任何網址」）。
 * 日期同出生地放喺 body。
 *
 * ⚠ 唔 cache：答案逐個生辰唔同，而且冇理由留喺任何中間人度。
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ slots: null }, { status: 400 });
  }
  const { date, placeIndex } = (body ?? {}) as Record<string, unknown>;
  const slots = slotsFor(date, placeIndex);
  return Response.json({ slots }, { status: slots ? 200 : 400, headers: { 'cache-control': 'no-store' } });
}
