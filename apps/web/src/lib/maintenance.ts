/**
 * 維修頁（2026-10-15）
 *
 * Vercel 嘅 pause 會出一版白底黑字嘅「DEPLOYMENT_PAUSED」，太核突。
 * 所以改由 middleware 自己攔：`MAINTENANCE_MODE=1` 嘅時候，每一頁都回呢版。
 *
 * 開關：Vercel → Settings → Environment Variables 加／刪 `MAINTENANCE_MODE`，然後 redeploy。
 * （middleware 嘅環境變數喺 build 嗰陣讀，淨係改變數唔 redeploy 唔會生效。）
 *
 * ⚠ 自成一頁，唔經 layout、字體、Supabase —— 維修嘅時候最好乜都唔使靠。
 *   字體用系統宋體；顏色抄 globals.css 嘅墨綠同燙金（品牌色，唔跟日夜讀轉）。
 * ⚠ 回 503 加 Retry-After：搜尋器當係暫時閂門，唔會將頁面除名。
 */
export function maintenanceOn(): boolean {
  return process.env.MAINTENANCE_MODE === '1';
}

export function maintenanceResponse(): Response {
  return new Response(HTML, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '3600',
      'x-robots-tag': 'noindex',
    },
  });
}

const HTML = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>星敘 · 暫時閉門</title>
<meta name="robots" content="noindex">
<style>
  :root { --jade:#16251f; --jade-2:#1f332a; --gilt:#c9ad74; --gilt-2:rgb(201 173 116 / .72); --rule:rgb(201 173 116 / .28); }
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; }
  body {
    background: radial-gradient(ellipse at 50% 30%, var(--jade-2), var(--jade) 70%);
    color: var(--gilt);
    font-family: 'Noto Serif TC', 'Songti TC', 'PMingLiU', 'MingLiU', serif;
    display: grid; place-items: center; padding: 24px 16px; overflow: hidden;
  }
  .stars { position: fixed; inset: 0; pointer-events: none; }
  .stars i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: var(--gilt); opacity: .5; animation: twinkle 4s ease-in-out infinite; }
  @keyframes twinkle { 50% { opacity: .12; } }
  @media (prefers-reduced-motion: reduce) { .stars i { animation: none; } }
  main { position: relative; text-align: center; max-width: 30rem; }
  .en-mark { font-family: 'Playfair Display', Georgia, serif; letter-spacing: .4em; font-size: .75rem; color: var(--gilt-2); }
  h1 { font-weight: 500; font-size: clamp(2.6rem, 9vw, 3.6rem); letter-spacing: .3em; margin: .6rem 0 0 .3em; }
  hr { border: 0; border-top: 1px solid var(--rule); width: 4rem; margin: 2rem auto; }
  p { line-height: 2; font-size: 1.05rem; }
  .sub { color: var(--gilt-2); font-size: .9rem; margin-top: .4rem; }
  .en { font-family: Georgia, serif; color: var(--gilt-2); font-size: .85rem; margin-top: 2.2rem; line-height: 1.7; }
</style>
</head>
<body>
<div class="stars" aria-hidden="true">
  <i style="top:12%;left:18%"></i><i style="top:22%;left:78%;animation-delay:1s"></i>
  <i style="top:8%;left:56%;animation-delay:2s"></i><i style="top:70%;left:10%;animation-delay:.5s"></i>
  <i style="top:82%;left:68%;animation-delay:3s"></i><i style="top:40%;left:90%;animation-delay:1.5s"></i>
  <i style="top:58%;left:30%;animation-delay:2.5s"></i><i style="top:30%;left:6%;animation-delay:3.5s"></i>
</div>
<main>
  <div class="en-mark">STELLOGUE</div>
  <h1>星敘</h1>
  <hr>
  <p>書齋暫時閉門整理，稍後再開。</p>
  <p class="sub">你之前存下的書都在，不會遺失。</p>
  <p class="en">We're tidying up the study and will reopen soon.<br>Your saved books are safe.</p>
</main>
</body>
</html>`;
