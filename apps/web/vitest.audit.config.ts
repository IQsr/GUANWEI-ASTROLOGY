import { defineConfig } from 'vitest/config';
import base from './vitest.config';

/** 內容審核腳本：唔入 `vitest run` 正常測試，用 `npm run audit:book` 先跑。
 * 唔用 mergeConfig：佢會將 include 陣列串埋，連正常測試都跑。 */
export default defineConfig({
  ...base,
  test: { ...base.test, include: ['audit/**/*.audit.ts'], testTimeout: 600_000 },
});
