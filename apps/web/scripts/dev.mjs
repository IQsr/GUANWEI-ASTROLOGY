/**
 * 預覽用嘅 dev 入口（2026-10-04 · 轉 Turbopack）
 *
 * pnpm 畀 Device Guard 擋咗，預覽（.claude/launch.json）由 repo 根直接用 node 開 next。
 * Turbopack 搵 next-intl 嘅設定（./src/i18n/request.ts）係跟「而家喺邊個資料夾」計，
 * 喺 repo 根開就搵唔到 —— 所以先 chdir 入 apps/web，再交返畀 next 自己嘅 bin。
 *
 *   node apps/web/scripts/dev.mjs [-p 3000]
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('..', import.meta.url));
process.chdir(web);
process.argv = [process.argv[0], 'next', 'dev', '--turbopack', ...process.argv.slice(2)];
createRequire(import.meta.url)('next/dist/bin/next');
