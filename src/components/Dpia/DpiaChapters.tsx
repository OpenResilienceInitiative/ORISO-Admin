import type { ComponentType } from 'react';
import type { DpiaChapterProps } from './DpiaChapterShared';
import { DpiaChapter1 } from './DpiaChapter1';
import { DpiaChapter2 } from './DpiaChapter2';
import { DpiaChapter6 } from './DpiaChapter6';
import { DpiaChapter7 } from './DpiaChapter7';
import { DpiaChapter8 } from './DpiaChapter8';
import { DpiaChapter9 } from './DpiaChapter9';
import { DpiaChapter10 } from './DpiaChapter10';
import { DpiaChapter11 } from './DpiaChapter11';

export const ADDITIONAL_CHAPTER_IDS = ['kap1', 'kap2', 'kap6', 'kap7', 'kap8', 'kap9', 'kap10', 'kap11'] as const;
export type AdditionalChapterId = (typeof ADDITIONAL_CHAPTER_IDS)[number];
export type DpiaChapterComponents = Partial<Record<AdditionalChapterId, ComponentType<DpiaChapterProps>>>;

/** Optional shell slots: navigation derives from these mounted components. */
export const DPIA_CHAPTERS = {
    kap1: DpiaChapter1,
    kap2: DpiaChapter2,
    kap6: DpiaChapter6,
    kap7: DpiaChapter7,
    kap8: DpiaChapter8,
    kap9: DpiaChapter9,
    kap10: DpiaChapter10,
    kap11: DpiaChapter11,
} satisfies DpiaChapterComponents;
