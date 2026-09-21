import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 引擎同內容庫都以 TS 原始碼形式引入，冇 build step。
  transpilePackages: ['@guanwei/ziwei', '@guanwei/content'],
};

export default withNextIntl(nextConfig);
