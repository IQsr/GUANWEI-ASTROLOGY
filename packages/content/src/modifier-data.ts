/**
 * 修飾語實例（工單 C6）
 *
 * 廟旺 70 ＋ 四化 40 ＋ 六煞 72 = 182 句。
 */
import brightness from './modifiers/brightness.json';
import sihua from './modifiers/sihua.json';
import malefic from './modifiers/malefic.json';
import { buildModifiers, bandOf, type Modifier } from './modifier';

export const MODIFIERS: Modifier[] = buildModifiers([
  ...(brightness as unknown[]),
  ...(sihua as unknown[]),
  ...(malefic as unknown[]),
]);

export function modifiersOf(kind: Modifier['kind']): Modifier[] {
  return MODIFIERS.filter((m) => m.kind === kind);
}

/** 某粒星喺某個廟旺級數之下嘅修飾語。 */
export function brightnessModifier(star: string, level: string): Modifier | null {
  const band = bandOf(level);
  if (!band) return null;
  return MODIFIERS.find((m) => m.kind === 'brightness' && m.star === star && m.key === band) ?? null;
}

/** 某粒星化某之下嘅修飾語。冇就係 null —— 天相同七殺永遠唔化。 */
export function sihuaModifier(star: string, hua: string): Modifier | null {
  return MODIFIERS.find((m) => m.kind === 'sihua' && m.star === star && m.key === hua) ?? null;
}

export function maleficModifier(malefic: string, palace: string): Modifier | null {
  return MODIFIERS.find((m) => m.kind === 'malefic' && m.star === malefic && m.key === palace) ?? null;
}

export function modifierCoverage() {
  return {
    brightness: modifiersOf('brightness').length,
    sihua: modifiersOf('sihua').length,
    malefic: modifiersOf('malefic').length,
    total: MODIFIERS.length,
  };
}
