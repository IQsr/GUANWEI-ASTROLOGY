import { Seal } from '@/components/Seal';
import { MARK } from '@/lib/site';

/**
 * 章名（2026-10-04 · 參考實體書效果圖）
 *
 * 桌面：直排大字浮喺右頁右上角，上面細字章序，下面一個朱砂細印；正文喺左邊繞住排。
 * 手機：位窄，照舊橫排。
 *
 * 讀屏只讀橫排嗰份（桌面用視覺隱藏）；直排嗰份 aria-hidden，唔會讀兩次。
 * 直排逐個字一行，唔用 writing-mode —— 同書脊一樣嘅理由：字體未載入時兩個字會疊埋。
 *
 * 章名格式：「三 · 夫妻」「序 · 你的命盤」→ 章序 ＋ 名；「這十年」冇章序。
 */
export function ChapterTitle({ title }: { title: string }) {
  const [head, name] = title.includes(' · ') ? (title.split(' · ') as [string, string]) : [null, title];
  return (
    <h1 className="zhang-ti text-h1 font-semibold tracking-[0.16em]">
      <span className="zhang-ti-heng">{title}</span>
      <span className="zhang-ti-zhi" aria-hidden="true">
        {/* 數字章序細細一劃似一條線（「一」），加「第」先讀得出係章序；「序」照寫 */}
        {head ? <span className="zhang-ti-xu">{/^[一二三四五六七八九十]+$/.test(head) ? `第${head}` : head}</span> : null}
        <span className="zhang-ti-zi">
          {[...name].map((c, i) => (
            <span key={`${c}-${i}`}>{c}</span>
          ))}
        </span>
        <Seal text={MARK} label="" className="zhang-ti-yin" />
      </span>
    </h1>
  );
}
