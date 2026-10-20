import { afterEach, expect, it, vi } from 'vitest';
import { supabaseServer } from '@/lib/supabase.server';
import { castQuotaLeft } from '@/lib/chengshu.server';

vi.mock('@/lib/supabase.server', () => ({ supabaseServer: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

it('連線建立或身分查詢拋錯時，配額預查回未知而非阻擋題名', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(supabaseServer).mockImplementation(() => { throw new Error('missing configuration'); });
  await expect(castQuotaLeft()).resolves.toBeNull();
  vi.mocked(supabaseServer).mockReturnValue({
    auth: { getUser: vi.fn().mockRejectedValue(new Error('transport failure')) },
  } as unknown as ReturnType<typeof supabaseServer>);
  await expect(castQuotaLeft()).resolves.toBeNull();
});

it('已查到的零配額仍回零，保留排盤前限制', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
  vi.mocked(supabaseServer).mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'reader' } } }) }, rpc,
  } as unknown as ReturnType<typeof supabaseServer>);
  await expect(castQuotaLeft()).resolves.toBe(0);
  expect(rpc).toHaveBeenCalledWith('cast_quota');
});
