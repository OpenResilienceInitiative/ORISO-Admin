import { describe, expect, it } from 'vitest';
import { queryClient } from './client';

describe('queryClient', () => {
    it('disables query retries and window-focus refetches by default', () => {
        const options = queryClient.getDefaultOptions();

        expect(options.queries?.retry).toBe(false);
        expect(options.queries?.refetchOnWindowFocus).toBe(false);
    });
});
