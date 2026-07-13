import { describe, expect, it } from 'vitest';
import { findUncoveredTopics } from './topicAgencyCoverage';

const agencies = [
    { id: 272, topics: [{ id: 10 }, { id: 3 }] },
    { id: 273, topics: [{ id: 7 }] },
    { id: 274, topics: [] as Array<{ id: number }> },
];

describe('findUncoveredTopics (ADR-003 topic/agency coverage)', () => {
    it('returns no mismatch when no topic is selected', () => {
        expect(findUncoveredTopics([{ value: '272', label: 'A' }], [], agencies)).toEqual([]);
    });

    it('returns no mismatch when every topic is covered by a selected agency', () => {
        const result = findUncoveredTopics(
            [{ value: '272', label: 'Agency 272' }],
            [
                { value: '10', label: 'Eltern und Familie' },
                { value: '3', label: 'U25' },
            ],
            agencies,
        );
        expect(result).toEqual([]);
    });

    it('flags a topic not offered by any selected agency (the demo case)', () => {
        const result = findUncoveredTopics(
            [{ value: '273', label: 'Agency 273' }],
            [{ value: '10', label: 'Eltern und Familie' }],
            agencies,
        );
        expect(result.map((t) => t.value)).toEqual(['10']);
    });

    it('ignores topics offered by an agency that is not selected', () => {
        const result = findUncoveredTopics(
            [{ value: '274', label: 'Empty agency' }],
            [{ value: '7', label: 'HIV' }],
            agencies,
        );
        expect(result.map((t) => t.value)).toEqual(['7']);
    });

    it('treats every topic as uncovered when no agency is selected', () => {
        const result = findUncoveredTopics([], [{ value: '10', label: 'Eltern und Familie' }], agencies);
        expect(result.map((t) => t.value)).toEqual(['10']);
    });

    it('coerces mixed string/number ids consistently', () => {
        const result = findUncoveredTopics(
            [{ value: '272', label: 'Agency 272' }],
            [{ value: '10', label: 'ten' }],
            [{ id: '272', topics: [{ id: '10' }] }],
        );
        expect(result).toEqual([]);
    });
});
