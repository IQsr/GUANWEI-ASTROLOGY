"use client";

import { useState } from "react";
import { Juanzhou } from "@/components/Juanzhou";
import { EMPTY_DRAFT, type Draft } from "@/lib/luokuan";

/**
 * 樣板：落款卷軸（/tokens/juanzhou）
 *
 * 同真流程一樣嘅卷軸、一樣嘅欄（時辰照樣問 `/api/slots`），但落印唔排盤：
 * 印落、卷軸捲埋之後，出一句「呢度會入題名幕」，再撳就重新來過。
 */
export function JuanzhouDemo() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [sealed, setSealed] = useState(false);
  const [folded, setFolded] = useState(false);

  if (folded) {
    return (
      <div className="mx-auto max-w-banxin py-24 text-center">
        <p className="text-sm leading-[1.9] text-ink-2">（真流程：卷軸捲埋之後，入題名幕 —— 合埋嗰本線裝書，名寫喺題簽上。）</p>
        <button
          type="button"
          className="mt-6 text-cap tracking-[0.12em] text-ink-3 underline-offset-4 hover:underline"
          onClick={() => {
            setSealed(false);
            setFolded(false);
          }}
        >
          再試一次
        </button>
      </div>
    );
  }

  return (
    <Juanzhou
      draft={draft}
      setDraft={setDraft}
      sealed={sealed}
      busy={false}
      onSeal={() => setSealed(true)}
      onFolded={() => setFolded(true)}
    />
  );
}
