import {afterAll} from 'vitest';
/**
 * 樣本書存檔鎖：用刪句表（packages/content/src/lexicon/base-cuts.json）之前嘅星性原文生成，
 * 等 hash 照舊同存檔逐字比對。要喺任何 content 模組載入之前 import（`life-steps-legacy.ts` 第一行）。
 */
process.env.GUANWEI_HISTORICAL_BASE='1';
afterAll(()=>{delete process.env.GUANWEI_HISTORICAL_BASE;});
