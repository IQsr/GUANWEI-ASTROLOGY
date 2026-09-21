import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';
import { LEXICON_LOCALE } from './lib/lexicon';
import { parsePublicEnv } from './lib/env';

const intl = createMiddleware(routing);

/**
 * ⚠ 藏經閣唔參與語言協商。
 *
 * 全站 routing 係 `localePrefix: 'as-needed'` ＋ 自動偵測 `Accept-Language`，
 * 所以一個英文瀏覽器開 `/lexicon` 會被轉去 `/en/lexicon` —— 而嗰條路由
 * 我哋特登唔出（詞條只有繁中，出個英文殼係重複內容）。結果係 **404**。
 *
 * 呢個由 D1 影相嗰陣先發現：curl 通，瀏覽器 404 ——
 * 分別就係 curl 唔送 `Accept-Language`。
 * 而藏經閣係全站唯一嘅流量入口（架構 §9、競品對照），
 * 一個英文瀏覽器嘅訪客撞 404，即係最緊要嗰道門對住一半人係閂咗。
 *
 * 所以呢一層喺語言協商**之前**攔住：
 *
 *   /en/lexicon…  → 301 去 /lexicon…   （唯讀嗰版，唔係另一版）
 *   /lexicon…     → 直接落 zh-Hant，唔偵測
 *
 * 用 301 唔用 307：呢個唔係一時嘅轉向，係「呢條路由永遠只有一個語言」。
 * 搜尋器應該收檔，唔應該每次返嚟再試。
 */
const LEXICON = '/lexicon';

/**
 * 私密層（架構 §2）。得呢幾條路要 session。
 *
 * ⚠ 公開層（`/`、`/lexicon/**`）一個字都唔關 auth 事 ——
 * 佢哋係靜態頁，而且藏經閣係全站唯一嘅流量入口（D1）。
 * 所以 session 續期只喺私密層行：公開層唔會因為 Supabase 有事而受影響。
 */
const PRIVATE = ['/shelf', '/book', '/claim', '/account', '/pay'];

function isPrivate(pathname: string): boolean {
  const bare = routing.locales.reduce(
    (p, locale) => (p.startsWith(`/${locale}/`) ? p.slice(`/${locale}`.length) : p),
    pathname,
  );
  return PRIVATE.some((p) => bare === p || bare.startsWith(`${p}/`));
}

/**
 * 續 session（V-003，G1 嗰陣答應咗留畀 E3 嗰半日）
 *
 * Supabase 嘅 access token 會過期。`getUser()` 會順手續，
 * 而續返嗰個要寫返落 response 嘅 cookie 度 —— 所以要喺 middleware 做。
 *
 * ⚠ 冇環境變數就直接算數，唔 throw。
 * 唔係為咗遮掩：私密層冇咗 Supabase 本來就行唔到，
 * 而嗰件事**應該喺頁嗰度講**（`/shelf` 會出「一時搵不到你的書架」），
 * 唔應該喺 middleware 度變成全站 500 —— 咁樣會連公開層都拖冧。
 */
async function refreshSession(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const env = parsePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!env.ok) return res;

  const supabase = createServerClient(env.value.url, env.value.anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  for (const locale of routing.locales) {
    if (locale === LEXICON_LOCALE) continue;
    const prefixed = `/${locale}${LEXICON}`;
    if (pathname === prefixed || pathname.startsWith(`${prefixed}/`)) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(`/${locale}`.length);
      return NextResponse.redirect(url, 301);
    }
  }

  /* 冇前綴嘅 /lexicon：直接行，唔好畀 Accept-Language 搬走佢。 */
  if (pathname === LEXICON || pathname.startsWith(`${LEXICON}/`)) {
    return NextResponse.rewrite(
      new URL(`/${LEXICON_LOCALE}${pathname}${req.nextUrl.search}`, req.url),
    );
  }

  const res = intl(req);
  return isPrivate(pathname) ? refreshSession(req, res) : res;
}

export const config = {
  // 跳過 API、Next 內部資源、同埋任何有副檔名嘅檔案。
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
