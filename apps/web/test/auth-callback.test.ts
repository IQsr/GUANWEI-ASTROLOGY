import { describe, expect, it } from 'vitest';
import { callbackPlan, claimRedirect } from '@/lib/auth-callback';

describe('認領驗證信嘅落腳點', () => {
  const plan = (q: string) => callbackPlan(new URLSearchParams(q));

  it('PKCE：有 code 就換 session', () => {
    expect(plan('code=abc&next=/pay/123')).toEqual({ kind: 'code', code: 'abc', next: '/pay/123' });
  });

  it('token_hash ＋ type：verifyOtp', () => {
    expect(plan('token_hash=h&type=email_change&next=/shelf')).toEqual({ kind: 'otp', tokenHash: 'h', type: 'email_change', next: '/shelf' });
  });

  it('唔認得嘅 type 唔拎去驗', () => {
    expect(plan('token_hash=h&type=weird').kind).toBe('refresh');
  });

  it('next 只准站內路徑，冇就書齋', () => {
    expect(plan('code=a&next=https://evil.example').next).toBe('/shelf');
    expect(plan('code=a&next=//evil.example').next).toBe('/shelf');
    expect(plan('code=a').next).toBe('/shelf');
  });

  it('認領嘅 redirect 經 callback', () => {
    expect(claimRedirect('https://guanwei.app', '/pay/1')).toBe('https://guanwei.app/api/auth/callback?next=%2Fpay%2F1');
  });
});
