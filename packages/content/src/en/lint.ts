/**
 * 英文檢查（2026-10-05 · 起步版，對應 docs/en-voice.md 第五節）。
 * 同中文 lint 一樣：規則係字詞清單，見到就報。正文唔准出現；依據括號以後再分開處理。
 */
const RULES: [code: string, re: RegExp][] = [
  ['EN-F1 宿命', /\b(destin(y|ed)|fate|fated|doomed|meant to be|bound to)\b/i],
  ['EN-F2 恐嚇', /\b(disaster|disastrous|catastroph\w*|curse[ds]?|beware|deadly|danger(ous)?)\b/i],
  ['EN-F3 偽精準', /\d+\s?%|\bchance of\b|\bodds\b/i],
  ['EN-F5 禁止事件', /\b(cancer|surgery|accident|divorce|affair|death|die[ds]?|miscarriage|lawsuit|illness|disease)\b/i],
  ['EN-F6 AI 腔', /\b(overall|in summary|journey|navigate|embrace|delve|testament|unlock|it'?s important to note)\b/i],
  ['EN-F9 化解', /\b(remed(y|ies)|cure|ward off|charm|talisman|amulet)\b/i],
  ['EN-F10 替人決定', /\byou should (quit|leave|divorce|invest|buy|sell|break up)\b/i],
  ['EN-F11 保證', /\b(guaranteed?|certain to|will definitely)\b/i],
  ['EN-S 星座腔', /\b(the stars say|the universe|cosmic|manifest(ing)?|your season)\b/i],
  ['EN-X 感嘆號', /!/],
  ['EN-X 美式拼寫', /\b(color|favor|favorable|organiz\w*|realiz\w*|recogniz\w*|center|behavior|honor)\b/i],
  ['EN-X 漏中文', /[一-鿿]/],
];

export function scanEnglish(text: string): string[] {
  return RULES.filter(([, re]) => re.test(text)).map(([code]) => code);
}
