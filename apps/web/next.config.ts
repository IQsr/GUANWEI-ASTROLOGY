import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { securityHeaders } from './src/lib/security-headers';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 引擎同內容庫都以 TS 原始碼形式引入，冇 build step。
  transpilePackages: ['@guanwei/ziwei', '@guanwei/content'],
  /* 唔講用乜框架（少畀攻擊者一條線索） */
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV !== 'production', process.env.GUANWEI_INDEXABLE === '1') }];
  },
};

export default withNextIntl(nextConfig);
