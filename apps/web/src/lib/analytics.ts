/**
 * Analytics 事件嘅唯一出入口（工單 H1 · 架構 §10）
 *
 * ── 點解又係一個「唯一出入口」 ──
 *
 * 同 `lib/local.ts` 一模一樣嘅理由。架構 §10 寫住：
 * **「生辰唔准入 analytics event，只記步驟唔記值。」**
 *
 * 一條「記得唔好將生辰放入 event」嘅規矩係守唔到嘅 —— 冇人會喺 review
 * 度記得，而且最容易犯嗰下唔係有心：debug 嗰陣順手加個 `{ chart }`
 * 落去睇下排盤啱唔啱，然後嗰行留咗喺度。
 *
 * 所以呢一層唔係一個 SDK wrapper，係一道閘：
 * **事件同佢准帶嘅值，喺下面張表度寫死晒。** 表入面冇 `string`，
 * 所以一個自由文字欄位入唔到嚟 —— 唔係靠掃描，係型別上塞唔入。
 *
 * ── ⚠ 呢度冇埋線到任何 provider ──
 *
 * `track()` 而家乜都唔做。唔係佔位符，係**現況**：觀微一個 analytics
 * provider 都未揀。H1 交嘅係規格同閘，唔係一個埋咗線嘅 SDK。
 * 接 provider 嗰陣改 `SINK` 一處，其餘一個字都唔使郁。
 *
 * 寫住「乜都唔做」好過寫一個假嘅 `console.log` —— 後者會令人以為
 * 有嘢送緊出去，而實際上冇。
 */

/**
 * ⚠ 「唔記值」唔止係「唔記生日」。
 *
 * 由生辰推出嚟嘅盤面值，一樣係生辰。`五行局`＋`命宮`＋`性別`
 * 唔係一個人名，但佢哋一齊收窄緊同一件事 —— 而收窄一個出生時刻
 * 呢件事本身，就係我哋講緊唔會做嗰樣。
 *
 * 所以下面張表淨係准帶**流程狀態**：行到第幾步、成唔成功、
 * 收費定免費。一個盤面值都冇，一個 id 都冇。
 *
 * （讀者 id 一樣唔准入 —— 佢係假名唔係匿名：配返 DB 就認得返個人。）
 */
export const EVENTS = {
  /* ── 公開層 ─────────────────────────────── */
  'lexicon.view': { label: '藏經閣 · 睇條目', props: { kind: ['star', 'palace', 'hua', 'ju', 'index'] } },
  'enter.view': { label: '入齋', props: {} },

  /* ── 六幕 ──────────────────────────────── */
  'shelf.view': { label: '書齋', props: { state: ['empty', 'books', 'unavailable'] } },
  'shelf.take': { label: '取書', props: {} },
  'luokuan.step': { label: '開卷落款 · 行到邊一步', props: { step: ['name', 'date', 'time', 'place', 'sex'] } },
  /** ⚠ 只記「佢揀咗唔知」，唔記佢本來想填乜。 */
  'luokuan.time.unknown': { label: '落款 · 揀咗唔知時辰', props: {} },
  'cast.done': { label: '排盤收咗工', props: { result: ['full', 'partial', 'failed'] } },
  'timing.seal': { label: '合書題名 · 落印', props: {} },
  'juan.open': { label: '展卷', props: {} },

  /* ── 命書 ──────────────────────────────── */
  'chapter.view': { label: '讀一章', props: { tier: ['free', 'deep'] } },
  'caijuan.cut': { label: '裁開一章', props: {} },

  /* ── 帳號 ──────────────────────────────── */
  'claim.done': { label: '認領咗', props: {} },
} as const;

export type EventName = keyof typeof EVENTS;

type PropsOf<E extends EventName> = (typeof EVENTS)[E]['props'];

/** 一個事件准帶嘅值：全部由上面張表嘅字面量出，冇一個係 `string`。 */
export type EventProps<E extends EventName> = {
  [K in keyof PropsOf<E>]: PropsOf<E>[K] extends readonly (infer V)[] ? V : never;
};

/**
 * ⚠ 禁字名單由引擎自己行出嚟，唔係人手維護。
 *
 * B16 學過一次：一張要人記得去加嘅名單，就係一張會漏嘅名單。
 * 所以呢度列嘅係 `BirthInput` 同 `Chart` 嗰幾層嘅欄名 ——
 * 引擎日後加一個欄，加新欄嗰個人一定會喺呢度見到佢自己個名，
 * 因為佢就係照住同一份型別抄。
 *
 * （做唔到真係由型別生成：TypeScript 嘅型別喺 runtime 唔存在。
 * 所以改為由 `test/analytics.test.ts` 對住型別定義逐個字比對 ——
 * 引擎加咗欄而呢度冇跟，嗰條測試就紅。**呢個係真嘅閘，名單係影子。**）
 */
export const FORBIDDEN_KEYS = [
  /* 生辰輸入 */
  'solar', 'time', 'tz', 'place', 'sex', 'lng', 'lat', 'name', 'birth',
  /* 盤面 —— 由生辰推出嚟，一樣係生辰 */
  'chart', 'lunar', 'ganzhi', 'palaces', 'stars', 'wuxingJu', 'mingGong',
  'shenGong', 'decadals', 'sihua', 'annual',
  /* 身分 —— 假名唔係匿名 */
  'readerId', 'bookId', 'subjectId', 'chapterId', 'email', 'token', 'userId', 'id',
] as const;

/**
 * Runtime 閘。型別已經擋咗大部分，但 `track()` 有機會由一啲
 * 型別鬆咗嘅地方叫（`any`、JSON、將來個 provider 嘅 callback），
 * 所以再量一次。
 */
export function assertClean(event: string, props: Record<string, unknown>): void {
  if (!(event in EVENTS)) {
    throw new Error(`analytics：唔認得嘅事件「${event}」—— 事件要先喺 EVENTS 入面宣告`);
  }
  const allowed = EVENTS[event as EventName].props as Record<string, readonly string[]>;

  for (const [key, value] of Object.entries(props)) {
    const lower = key.toLowerCase();
    const bad = FORBIDDEN_KEYS.find((f) => lower === f.toLowerCase());
    if (bad) throw new Error(`analytics：「${event}」帶咗「${key}」—— 生辰同身分唔准入 event（架構 §10）`);

    const values = allowed[key];
    if (!values) throw new Error(`analytics：「${event}」唔收「${key}」—— 只准帶張表宣告咗嘅欄`);

    /*
     * ⚠ 值一定要係表入面列住嗰幾個之一。
     *
     * 呢條先係真正擋住生辰嗰條：欄名可以改，但一個 enum 塞唔入
     * 「1996-06-16」。一個自由文字欄位就係一條後門。
     */
    if (typeof value !== 'string' || !values.includes(value)) {
      throw new Error(
        `analytics：「${event}.${key}」只准係 ${values.join(' / ')}，收到 ${JSON.stringify(value)}`,
      );
    }
  }
}

/**
 * 送一個事件。
 *
 * ⚠ 而家乜都唔做 —— 觀微未揀 provider。見檔案開頭。
 * 接線嗰陣改呢一個 function，其餘一個字都唔使郁。
 */
export function track<E extends EventName>(
  event: E,
  ...args: keyof EventProps<E> extends never ? [] : [props: EventProps<E>]
): void {
  const props = (args[0] ?? {}) as Record<string, unknown>;
  try {
    assertClean(event, props);
  } catch (err) {
    /*
     * ⚠ 量度出事，唔可以連累用戶。
     *
     * 一個因為 analytics 而白屏嘅落款頁，比冇 analytics 差好多。
     * 開發嗰陣掟（測試會紅），上到線就靜靜雞唔送。
     */
    if (process.env.NODE_ENV !== 'production') throw err;
    return;
  }
  /* 冇 sink。接 provider 嗰陣喺呢度送。 */
}
