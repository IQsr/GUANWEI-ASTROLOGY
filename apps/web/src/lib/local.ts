/**
 * localStorage 嘅唯一出入口（工單 G1）
 *
 * ── 點解要有一個出入口 ──
 *
 * 架構 §5 最後一行：**localStorage 只存主題同上次讀到邊段。**
 *
 * 呢句唔係一個習慣，係一條隱私邊界。命書入面有生辰，而生辰喺 UK GDPR
 * 之下係個人資料（§10）—— 一旦有人為咗「順手」將 subject、chart、
 * 或者一段正文擺咗落 localStorage，嗰份資料就離開咗我哋刪得到嘅範圍：
 * `/account` 嘅「真刪除」刪唔到用戶部機入面嗰份。
 *
 * 一條「唔好亂擺嘢落 localStorage」嘅規矩係守唔到嘅。
 * 一個**得兩個 key 嘅 module** 守得到 —— 而且 `test/local.test.ts`
 * 會掃全個 `src/`，見到 `localStorage` 出現喺呢個檔以外就爆。
 */

export const LOCAL_KEYS = {
  /** 日讀／夜讀。冇佢，揀咗夜讀嘅人每次入嚟都會見到一閃嘅紙白。 */
  theme: 'gw-theme',
  /** 上次讀到邊一段。回訪落點要接得返（架構 §4）。 */
  lastRead: 'gw-last-read',
} as const;

export type LocalKey = keyof typeof LOCAL_KEYS;

/**
 * 全部讀寫都包住 try —— 私密視窗、封咗 site data、預覽器，
 * 呢三種情況下 `localStorage` 會 throw，而唔係回 null。
 * 記唔到就算：兩樣嘢都係方便，唔係內容。
 */
export function readLocal(key: LocalKey): string | null {
  try {
    return localStorage.getItem(LOCAL_KEYS[key]);
  } catch {
    return null;
  }
}

export function writeLocal(key: LocalKey, value: string): void {
  try {
    localStorage.setItem(LOCAL_KEYS[key], value);
  } catch {
    /* 記唔到就算 */
  }
}

export function clearLocal(key: LocalKey): void {
  try {
    localStorage.removeItem(LOCAL_KEYS[key]);
  } catch {
    /* 刪唔到就算 */
  }
}

/**
 * 畀 `<head>` 入面嗰段同步 script 用嘅讀法。
 *
 * 嗰段 script 喺 bundle 未載之前就要行（否則夜讀會閃一下紙白），
 * 所以佢 import 唔到上面啲 function —— 只可以攞一段字串返去砌。
 * 但 key 仍然係由呢度出，所以「得兩個 key」呢件事冇甩。
 */
export function inlineRead(key: LocalKey): string {
  return `localStorage.getItem(${JSON.stringify(LOCAL_KEYS[key])})`;
}
