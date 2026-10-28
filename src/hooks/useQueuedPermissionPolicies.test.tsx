import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQueuedPermissionPolicies } from './useQueuedPermissionPolicies';
import type { PolicyValue } from '../types/permissionPolicy';

describe('queued permission resource lifecycle', () => {
    it('does not resume an old save or its queued sibling after A to B to A navigation', async () => {
        const initial = { first: { value: false, mode: 'SUGGESTED' as const } };
        let release: (value: Record<string, PolicyValue<boolean>>) => void = () => undefined;
        const first = new Promise<Record<string, PolicyValue<boolean>>>((resolve) => {
            release = resolve;
        });
        const save = vi.fn().mockReturnValueOnce(first).mockResolvedValue(initial);
        const { result, rerender } = renderHook(
            ({ resource }) => useQueuedPermissionPolicies(resource, initial, save),
            {
                initialProps: { resource: 'A' },
            },
        );
        act(() => {
            result.current.changePolicy('first', { value: true, mode: 'SUGGESTED' });
            result.current.changePolicy('second', { value: true, mode: 'SUGGESTED' });
        });
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        rerender({ resource: 'B' });
        rerender({ resource: 'A' });

        await act(async () => {
            release({ first: { value: true, mode: 'SUGGESTED' } });
            await first;
        });

        expect(result.current.policies).toEqual(initial);
        expect(save).toHaveBeenCalledTimes(1);
    });
});
