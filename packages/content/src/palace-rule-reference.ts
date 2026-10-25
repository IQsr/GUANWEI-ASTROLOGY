import type { PalaceEvaluation } from './palace-predicate';

/** Keep rule prerequisites separate from evaluated natal facts; never infer absence from missing data. */
export function palaceRuleReference(rule: { heading: string; conditions: string[] }, evaluated: PalaceEvaluation, selected: boolean): string {
  const result = evaluated.status === 'not_applicable'
    ? '資料尚未齊備，暫不判定這項分支是否適用；未確認不等於本盤沒有。'
    : evaluated.matched
      ? selected ? '本盤符合已列明的條件，因此保留這項解讀。'
        : '本盤符合已列明的條件；此分支未另作一段，並不表示其作用已被抵銷。'
      : '本盤未符合這項分支的完整條件，因此不套用這項解讀。';
  const requirements = rule.conditions.join('；').replaceAll('沒有由單一化禄觸發不相關組合。', '單一化禄不能代替其他組合所需的配合。');
  return `${rule.heading}。${requirements ? `規則要求與限制：${requirements}${/[。！？]$/.test(requirements) ? '' : '。'}` : ''}本盤核對結果：${evaluated.checks.join('')}適用判斷：${result}`;
}
