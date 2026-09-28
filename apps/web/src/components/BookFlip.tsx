'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 揭書（落款 → 題名 → 展卷 用緊呢個；`Book` 留畀書架同樣板）
 *
 * `Book` 係「兩格闊度一齊變」（E2：只准 width、零 3D）。每一格都啱，
 * 但成件事似一塊板拉闊，唔似一本書翻開。呢個版本照真書嘅樣：
 *
 *   一、封面繞住書脊轉開。封面係一張雙面紙：正面係封面，背面係左頁。
 *       `rotateY(0 → -180deg)`，軸心喺左邊（書脊）。
 *   二、書脊企定。舞台一路係兩版闊、書脊喺正中；合埋嗰陣只有右半有嘢，
 *       所以本書企喺中線右邊，揭開之後封面落喺左半 —— 本書冇移過位。
 *   三、節奏有「起、行、落」：頭 14% 慢慢提起，中段快，落枱輕輕過咗少少
 *       再返正（見 globals.css `fan-kai`）。封面落定先，兩頁啲字先浮出嚟。
 *   四、光影同厚度：書縫附近有陰影（紙彎落去）、封面轉嘅時候下面嗰頁有
 *       一片影掃過、封面轉到側面變暗、書口有幾層紙。
 *
 * 合埋嗰陣 hover 熱區，封面會微微揭起少少 —— 講畀人聽佢揭得。
 * reduced-motion：直接到位，冇轉、冇影。
 *
 * ⚠ 推翻咗 E2「只准 width、零 3D」（Issac 2026-09 睇完 /tokens/fanshu 揀嘅）。
 *
 * 手機（容器 < 700px）：得一版。封面揭開向左轉出畫面，淨低右頁 ——
 * 同之前 `Book` 喺手機只出 recto 一樣。
 */
export function BookFlip({
  open,
  onToggle,
  onOpened,
  overlay,
  label,
  cover,
  verso,
  recto,
}: {
  open: boolean;
  /** 樣板用：成個封面變一粒冇樣嘅掣。真流程用 `overlay` 自己畀。 */
  onToggle?: () => void;
  /** 封面落定咗（動畫行完；reduced-motion 即刻）。展卷等佢先開始。 */
  onOpened?: () => void;
  /** 疊喺封面上面嘅嘢，例如題名幕嗰層熱區（`.mu-ti-kai`）。 */
  overlay?: ReactNode;
  label: string;
  cover: ReactNode;
  verso: ReactNode;
  recto: ReactNode;
}) {
  /* 只有「由一個狀態變去另一個」先播動畫；一入嚟就係最終狀態 */
  const [anim, setAnim] = useState<'kai' | 'he' | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (open) onOpened?.();
      return;
    }
    /* reduced-motion 冇動畫，animationend 唔會嚟 —— 即刻當落定咗 */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (open) onOpened?.();
      return;
    }
    setAnim(open ? 'kai' : 'he');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onOpened 係 callback，唔係觸發條件
  }, [open]);

  return (
    <div className="fan-wrap">
      <article
        className="fan"
        aria-label={label}
        data-state={open ? 'open' : 'closed'}
        /* 同 `.shu` 一樣嘅形名，驗收 script 用 */
        data-shape={open ? 'opened' : 'closed'}
        data-anim={anim ?? undefined}
        onAnimationEnd={(e) => {
          /*
           * 封面落定（fan-kai 完）就話畀外面知；但動畫狀態要等啲字浮完
           * （fan-mo）先清 —— 一清 `data-anim` 淡入就會喺中途被剪斷。
           */
          if (e.animationName === 'fan-kai') onOpened?.();
          if (e.animationName === (anim === 'kai' ? 'fan-mo' : 'fan-he')) setAnim(null);
        }}
      >
        {/* 右頁：一路喺度，唔郁 */}
        <div className="fan-recto" {...(open ? {} : { inert: true })}>
          <div className="fan-nei">{recto}</div>
          <i className="fan-kou" aria-hidden="true" />
        </div>

        {/* 封面：一張雙面紙，繞書脊轉 */}
        <div className="fan-ye">
          <div className="fan-mian" {...(open ? { inert: true } : {})}>
            {cover}
            {onToggle && !open ? (
              <button type="button" className="fan-kai" aria-label={`揭開${label}`} onClick={onToggle} />
            ) : null}
            {overlay}
          </div>
          <div className="fan-bei" {...(open ? {} : { inert: true })}>
            <div className="fan-nei">{verso}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
