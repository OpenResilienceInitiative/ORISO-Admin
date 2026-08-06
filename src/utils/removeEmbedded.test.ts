import { describe, expect, it } from 'vitest';
import removeEmbedded from './removeEmbedded';

describe('removeEmbedded', () => {
    it('maps _embedded list to {total, data}', () => {
        const result = { total: 2, _embedded: [{ id: 1 }, { id: 2 }] };
        expect(removeEmbedded(result)).toEqual({ total: 2, data: [{ id: 1 }, { id: 2 }] });
    });

    it('unwraps a nested _embedded on each item', () => {
        const result = {
            total: 2,
            _embedded: [{ _embedded: { id: 'a' } }, { id: 'b' }],
        };
        expect(removeEmbedded(result)).toEqual({ total: 2, data: [{ id: 'a' }, { id: 'b' }] });
    });

    it('returns empty data when _embedded is absent', () => {
        expect(removeEmbedded({ total: 0 })).toEqual({ total: 0, data: [] });
    });
});
