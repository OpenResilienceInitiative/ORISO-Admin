import { describe, expect, it } from 'vitest';
import { normalizeTopicIds } from './normalizeTopicIds';

describe('normalizeTopicIds (ADR-003 single-select topic picker)', () => {
    it('unwraps a single labelInValue Option to a one-element string[]', () => {
        expect(normalizeTopicIds({ value: '7', label: 'Debt counselling' })).toEqual(['7']);
    });

    it('treats a cleared field (undefined/null) as no topic', () => {
        expect(normalizeTopicIds(undefined)).toEqual([]);
        expect(normalizeTopicIds(null)).toEqual([]);
    });

    it('unwraps a legacy Option[] (former multi-select shape)', () => {
        expect(
            normalizeTopicIds([
                { value: '3', label: 'A' },
                { value: '9', label: 'B' },
            ]),
        ).toEqual(['3', '9']);
    });

    it('reads ids from the backend topic shape { id }', () => {
        expect(normalizeTopicIds({ id: 42, name: 'Pregnancy' } as any)).toEqual(['42']);
        expect(normalizeTopicIds([{ id: 1 }, { id: 2 }] as any)).toEqual(['1', '2']);
    });

    it('accepts raw ids as string, number, or string[]', () => {
        expect(normalizeTopicIds('5')).toEqual(['5']);
        expect(normalizeTopicIds(8 as any)).toEqual(['8']);
        expect(normalizeTopicIds(['5', '6'])).toEqual(['5', '6']);
    });

    it('is idempotent on an already-normalised string[]', () => {
        expect(normalizeTopicIds(['11'])).toEqual(['11']);
    });

    it('drops null, empty, and non-numeric entries', () => {
        expect(normalizeTopicIds([null, { value: '' }, { value: 'abc' }, { value: '4' }] as any)).toEqual(['4']);
    });

    it('handles the empty array (explicitly cleared) as no topic', () => {
        expect(normalizeTopicIds([])).toEqual([]);
    });
});
