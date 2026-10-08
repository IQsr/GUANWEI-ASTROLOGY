import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { contentSecurityPolicy, securityHeaders, CSP_HOSTS } from '@/lib/security-headers';

/** HTTP 安全標頭（2026-10-08 security 檢查） */
describe('安全標頭', () => {
  const prod = contentSecurityPolicy(false);
  const dev = contentSecurityPolicy(true);
  const directive = (csp: string, name: string) =>
    csp.split('; ').find((d) => d.startsWith(`${name} `))?.slice(name.length + 1).split(' ') ?? [];

  it('唔准被 iframe 包住（clickjacking）', () => {
    expect(directive(prod, 'frame-ancestors')).toEqual(["'none'"]);
    expect(securityHeaders(false).find((h) => h.key === 'X-Frame-Options')?.value).toBe('DENY');
  });

  it('production 冇 unsafe-eval、冇 ws:；connect-src 淨係自己', () => {
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'");
    expect(directive(prod, 'connect-src')).toEqual(["'self'"]);
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
  });

  it('object、base、外來 script 都收緊', () => {
    expect(directive(prod, 'object-src')).toEqual(["'none'"]);
    expect(directive(prod, 'base-uri')).toEqual(["'self'"]);
    expect(directive(prod, 'script-src').filter((s) => s.startsWith('http'))).toEqual([]);
  });

  it('冇講明可以收錄就 noindex（試部署唔好俾 Google 收錄）', () => {
    expect(securityHeaders(false).find((h) => h.key === 'X-Robots-Tag')?.value).toBe('noindex, nofollow');
    expect(securityHeaders(false, true).some((h) => h.key === 'X-Robots-Tag')).toBe(false);
  });

  it('HSTS 只喺 production', () => {
    expect(securityHeaders(false).some((h) => h.key === 'Strict-Transport-Security')).toBe(true);
    expect(securityHeaders(true).some((h) => h.key === 'Strict-Transport-Security')).toBe(false);
  });

  it('源碼入面每一個外部 https host 都喺 CSP 名單（加新 host 唔記得改 CSP 就會爆）', () => {
    const allowed = new Set<string>(Object.values(CSP_HOSTS));
    const seen = new Set<string>();
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|css)$/.test(f)) {
          for (const m of readFileSync(p, 'utf8').matchAll(/['"(`](https:\/\/[a-z0-9.-]+)/g)) seen.add(m[1]!);
        }
      }
    };
    walk(join(__dirname, '../src/components'));
    walk(join(__dirname, '../src/app'));
    expect([...seen].filter((h) => !allowed.has(h))).toEqual([]);
  });
});
