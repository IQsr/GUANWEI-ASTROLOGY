/**
 * 章框實例（工單 C7）
 *
 * 開場 12 ＋ 過場 12 ＋ 收束 48 = 72 句。
 */
import raw from './frames/frames.json';
import { buildFrames, openFrame, pickClose, pickTransition, transitionWhitelist, isTransition, mostSimilarFrames, frameCoverage, type Frame, type Slot } from './frame';

export const FRAMES: Frame[] = buildFrames(raw as unknown[]);

export const closeFor = (palace: string, seed: string) => pickClose(FRAMES, palace, seed);
export const openFor = (palace: string) => openFrame(FRAMES, palace);
export const transitionFor = (from: Slot, to: Slot, seed: string) => pickTransition(FRAMES, from, to, seed);
/** 一個插槽接口嘅全部過場句。組裝器要揀「唔撞」嗰句，所以佢要見到成個 bank。 */
export const transitionBank = (from: Slot, to: Slot) =>
  FRAMES.filter((f) => f.kind === 'transition' && f.from === from && f.to === to);
export const TRANSITION_WHITELIST = () => transitionWhitelist(FRAMES);
export const isWhitelistedTransition = (s: string) => isTransition(FRAMES, s);
export const mostSimilarCloses = (top = 10) => mostSimilarFrames(FRAMES, top);
export const frameStats = () => frameCoverage(FRAMES);
