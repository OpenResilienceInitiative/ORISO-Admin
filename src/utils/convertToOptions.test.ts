import { describe, expect, it } from 'vitest';
import { convertToOptions } from './convertToOptions';

describe('convertToOptions', () => {
    it('maps a flat list to {key,label,value} with stringified values', () => {
        const data = [
            { id: 1, name: 'Alpha' },
            { id: 2, name: 'Beta' },
        ];
        expect(convertToOptions(data, 'name', 'id')).toEqual([
            { key: '1', label: 'Alpha', value: '1' },
            { key: '2', label: 'Beta', value: '2' },
        ]);
    });

    it('joins multiple label keys with a space', () => {
        const data = [{ id: 7, first: 'Ada', last: 'Lovelace' }];
        expect(convertToOptions(data, ['first', 'last'], 'id')).toEqual([
            { key: '7', label: 'Ada Lovelace', value: '7' },
        ]);
    });

    it('resolves dot-notated nested label paths', () => {
        const data = [{ id: 3, meta: { title: 'Nested' } }];
        // labelKey is a runtime dot-path; cast around the keyof typing.
        expect(convertToOptions(data, 'meta.title' as never, 'id')).toEqual([
            { key: '3', label: 'Nested', value: '3' },
        ]);
    });

    it('drops entries with null/undefined value when filterEmptyValues is true', () => {
        const data = [
            { id: 1, name: 'keep' },
            { id: null as unknown as number, name: 'drop' },
            { id: undefined as unknown as number, name: 'drop2' },
        ];
        expect(convertToOptions(data, 'name', 'id', true)).toEqual([{ key: '1', label: 'keep', value: '1' }]);
    });

    it('keeps null-value entries when filterEmptyValues is false', () => {
        const data = [{ id: null as unknown as number, name: 'kept' }];
        const result = convertToOptions(data, 'name', 'id', false);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('kept');
    });

    it('returns an empty array for undefined input', () => {
        expect(convertToOptions(undefined as never, 'name' as never, 'id' as never)).toEqual([]);
    });
});
