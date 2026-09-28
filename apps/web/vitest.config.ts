import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      /*
       * 'server-only' 係 Next 嘅守門：client bundle import 咗就 build 爆。
       * vitest 唔係 Next，換成一個空 module，server 嗰啲 lib（例如 mingshu 嘅
       * bookChapters）先測得到 —— 之前測唔到，宮位章冇分段嘅 bug 就係噉漏咗。
       */
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: { include: ['test/**/*.test.ts'] },
});
