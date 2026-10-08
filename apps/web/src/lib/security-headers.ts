/**
 * HTTP 安全標頭（2026-10-08 security 檢查 🟠1）
 *
 * ── CSP 點解咁寫 ──
 *
 * 全站對外只連兩個 host：Google Fonts 嘅 CSS（fonts.googleapis.com）同字型檔（fonts.gstatic.com）。
 * 瀏覽器唔直接連 Supabase、Stripe —— 兩樣都經我哋 server；付款係 server 轉去 checkout.stripe.com。
 * 所以 connect-src 淨係 'self'，有人塞到 script 入嚟都送唔到資料出去。
 *
 * ⚠ script-src 有 'unsafe-inline'：Next 嘅 RSC payload（`self.__next_f.push`）同夜讀主題嗰段
 * 都係 inline script。唔用 'unsafe-inline' 就要逐個 request 出 nonce —— 噉樣全站變晒動態，
 * 藏經閣嗰 35 版靜態頁（SEO）冇得預先砌。我哋冇任何地方 render 用戶畀嘅 HTML（React 會 escape），
 * 所以 inline 嘅風險細；外來 script 一律擋。日後要收緊就行 middleware nonce。
 *
 * 開發模式要多 'unsafe-eval'（React 除錯）同 ws:（熱更新）。
 */

export const CSP_HOSTS = {
  fontCss: 'https://fonts.googleapis.com',
  fontFiles: 'https://fonts.gstatic.com',
  /* 付款頁：冇 JS 嘅 form POST 收到 303 轉去 Stripe，Chrome 會用 form-action 檢查 */
  checkout: 'https://checkout.stripe.com',
} as const;

export function contentSecurityPolicy(dev: boolean): string {
  const d: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'", CSP_HOSTS.fontCss],
    'font-src': ["'self'", CSP_HOSTS.fontFiles],
    'img-src': ["'self'", 'data:', 'blob:'],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", CSP_HOSTS.checkout],
    /* 唔准任何網站用 iframe 包住我哋（clickjacking：付款、刪帳） */
    'frame-ancestors': ["'none'"],
  };
  /* 冇 upgrade-insecure-requests：驗收腳本用 http://localhost 跑 production build；HSTS 已經夠 */
  return Object.entries(d)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

export function securityHeaders(dev: boolean): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(dev) },
    /* 舊瀏覽器唔識 frame-ancestors */
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    /* 書嘅網址有書號：去第三方嗰陣唔好帶住成條路徑 */
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    /* 瀏覽器只喺 https 先理 HSTS，所以 http://localhost 跑 production build 冇影響 */
    ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
  ];
}
