/**
 * 認領提示：得三個位（工單 G2 · 架構 §4）
 *
 * ── 點解要數 ──
 *
 * 架構 §4 寫住：「認領提示**只准出現三次**：成書後（可撳走）／
 * 第二次回訪（書架頂一條界欄）／付款前（硬閘）」，
 * 再加一句「匿名清 cookie = 永久失去命書，**老實講一次就唔好再嘈**」。
 *
 * 「只准三次」係一句寫得出就量得到嘅嘢，所以佢唔應該散喺三個 component
 * 入面各自 `if`。散咗就冇人數得到總數，而第四個位一定會喺某一版
 * 悄悄咁出現 —— 每一個都有佢嘅理由，加埋就係一個成日叫你開戶口嘅網。
 *
 * 所以三個位寫成一張表，出唔出由一個 function 答。
 */

/** 三個位，冇第四個。 */
export const CLAIM_MOMENTS = ['titled', 'shelf', 'checkout'] as const;
export type ClaimMoment = (typeof CLAIM_MOMENTS)[number];

export type ClaimPrompt = {
  at: ClaimMoment;
  /** 佢生成點樣：一段可撳走嘅細字／一條界欄／一道過唔到嘅閘。 */
  form: 'dismissible' | 'rule' | 'gate';
  /** 撳得走嘅先算 dismissible。硬閘撳唔走 —— 撳得走就唔係閘。 */
  dismissible: boolean;
  /** 擋唔擋住條路。全站得一個位會擋。 */
  blocks: boolean;
};

export const CLAIM_PROMPTS: Record<ClaimMoment, ClaimPrompt> = {
  /** 題完名，本書啱啱有咗個名。呢度講一次代價，然後收聲。 */
  titled: { at: 'titled', form: 'dismissible', dismissible: true, blocks: false },
  /** 第二次回訪，書架頂一條界欄。唔擋路，唔可以撳走 —— 佢本來就唔阻住你。 */
  shelf: { at: 'shelf', form: 'rule', dismissible: false, blocks: false },
  /** 付款前。呢個係閘，唔係提示。 */
  checkout: { at: 'checkout', form: 'gate', dismissible: false, blocks: true },
};

export type ClaimFacts = {
  /** 未認領先有得提。認咗就永遠唔會再見到。 */
  isAnonymous: boolean;
  /** 一日算一次（DB 嘅 `touch_visit()`）。 */
  visitDays: number;
  /** 「成書後」嗰個撳走咗未（DB 嘅 `claim_dismissed_at`）。 */
  dismissed: boolean;
};

/**
 * 呢一刻應唔應該提認領？
 *
 * ⚠ 兩條唔可以違反嘅規矩，都喺呢個 function 入面：
 *
 * 一、**認咗領就永遠唔再提。** 唔係少提，係一次都唔提。
 * 二、**撳走「成書後」嗰個，撳唔走付款前嗰道閘。**
 *     一個撳一下就冇咗嘅硬閘，唔係硬閘。
 */
export function claimPromptFor(
  moment: ClaimMoment | (string & {}),
  facts: ClaimFacts,
): ClaimPrompt | null {
  if (!facts.isAnonymous) return null;
  if (!(CLAIM_MOMENTS as readonly string[]).includes(moment)) return null;

  const prompt = CLAIM_PROMPTS[moment as ClaimMoment];

  /* 撳走咗嘅，淨係關「成書後」嗰個事。 */
  if (prompt.at === 'titled' && facts.dismissed) return null;

  /* 「第二次回訪」就係第二日，唔係第三日，亦都唔係每一日。 */
  if (prompt.at === 'shelf' && facts.visitDays !== 2) return null;

  return prompt;
}
