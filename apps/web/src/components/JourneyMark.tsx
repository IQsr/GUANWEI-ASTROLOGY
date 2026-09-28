import { STEPS, type StepN } from '@/lib/journey';

/**
 * 你而家喺第幾步（重新設計第二期）
 *
 * 首頁底嗰四步（落款 → 取書 → 閱讀 → 深讀）喺每一版卷首右上角
 * 再出一次，企緊嗰步亮。之前全站冇一處講「你喺成個過程嘅邊度」——
 * 每一版都講得清自己，但唔知自己喺條路嘅邊一段。
 *
 * 手機收成「03 / 04 閱讀」一行，唔擠四格。
 */
export function JourneyMark({ step }: { step: StepN }) {
  const here = STEPS.find((s) => s.n === step)!;
  return (
    <ol aria-label="你在第幾步" className="flex items-center gap-3 text-cap tracking-[0.14em] text-ink-3">
      {STEPS.map((s, i) => (
        <li
          key={s.n}
          aria-current={s.n === step ? 'step' : undefined}
          className={`hidden items-center gap-3 sm:flex ${s.n === step ? 'text-ink' : ''}`}
        >
          {i > 0 ? <span aria-hidden="true" className="block h-px w-5 bg-rule" /> : null}
          <span className="font-latin" data-nums>
            {String(s.n).padStart(2, '0')}
          </span>
          <span className={s.n === step ? 'border-b border-gold pb-0.5' : ''}>{s.name}</span>
        </li>
      ))}
      <li aria-hidden="true" className="flex items-center gap-2 sm:hidden">
        <span className="font-latin" data-nums>
          {String(step).padStart(2, '0')} / 04
        </span>
        <span className="text-ink">{here.name}</span>
      </li>
    </ol>
  );
}
