import { isValidElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { collectTileHelpTopics } from './collectTileHelpTopics';

/**
 * Every explanation slide shows a drawing. A slide without one would show the tile icon in the
 * picture box instead, which is only meant as a stand-in while a drawing is still being made.
 */
describe('tile help pictures', () => {
    const topics = collectTileHelpTopics();
    const slides = topics.flatMap((topic) => topic.slides.map((slide) => ({ topic: topic.id, slide })));

    it('finds the help topics (guards the lookup itself)', () => {
        // 31 topics and 101 slides when this was written; the numbers only ever grow.
        expect(topics.length).toBeGreaterThanOrEqual(31);
        expect(slides.length).toBeGreaterThanOrEqual(101);
    });

    it('gives every slide of every topic a drawing', () => {
        const without = slides
            .filter(({ slide }) => !isValidElement(slide.visual))
            .map(({ topic, slide }) => `${topic}/${slide.id}`);
        expect(without).toEqual([]);
    });

    it('points every picture at a file', () => {
        const withoutFile = slides
            .filter(({ slide }) => {
                const src = isValidElement<{ src?: unknown }>(slide.visual) ? slide.visual.props.src : undefined;
                return typeof src !== 'string' || src.length === 0;
            })
            .map(({ topic, slide }) => `${topic}/${slide.id}`);
        expect(withoutFile).toEqual([]);
    });
});
