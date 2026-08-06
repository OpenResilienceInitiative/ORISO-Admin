import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHUNK_RELOAD_FLAG, RELOAD_FALLBACK_MS, isChunkLoadError, loadChunk } from './lazyNamed';

const chunkError = () => new Error('Failed to fetch dynamically imported module: /admin/assets/Edit-BFwFo16b.js');

describe('isChunkLoadError', () => {
    it.each([
        'Failed to fetch dynamically imported module: /admin/assets/Edit-BFwFo16b.js',
        'error loading dynamically imported module',
        'Importing a module script failed.',
        'Loading chunk 42 failed.',
    ])('recognises %s', (message) => {
        expect(isChunkLoadError(new Error(message))).toBe(true);
    });

    it('recognises webpack-style ChunkLoadError by name', () => {
        const error = new Error('boom');
        error.name = 'ChunkLoadError';
        expect(isChunkLoadError(error)).toBe(true);
    });

    it('does not mistake a genuine error inside the module for a chunk failure', () => {
        expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    });

    it('tolerates nullish errors', () => {
        expect(isChunkLoadError(undefined)).toBe(false);
    });
});

describe('loadChunk', () => {
    let reload: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        window.sessionStorage.clear();
        reload = vi.fn();
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, reload },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the module when the import succeeds', async () => {
        const factory = vi.fn().mockResolvedValue({ Page: 'component' });

        await expect(loadChunk(factory)).resolves.toEqual({ Page: 'component' });
        expect(factory).toHaveBeenCalledTimes(1);
        expect(reload).not.toHaveBeenCalled();
    });

    it('retries once so a transient network blip does not reach the ErrorBoundary', async () => {
        const factory = vi.fn().mockRejectedValueOnce(chunkError()).mockResolvedValueOnce({ Page: 'component' });

        await expect(loadChunk(factory)).resolves.toEqual({ Page: 'component' });
        expect(factory).toHaveBeenCalledTimes(2);
        expect(reload).not.toHaveBeenCalled();
    });

    it('reloads once when the chunk is gone for good — the stale-index.html case', async () => {
        const factory = vi.fn().mockRejectedValue(chunkError());

        let settled = false;
        loadChunk(factory).then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );
        await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

        expect(factory).toHaveBeenCalledTimes(2);
        expect(window.sessionStorage.getItem(CHUNK_RELOAD_FLAG)).toBe('1');
        // The promise must never settle, or the ErrorBoundary flashes before the reload lands.
        await Promise.resolve();
        expect(settled).toBe(false);
    });

    it('does not reload a second time — a broken chunk must not loop', async () => {
        window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
        const factory = vi.fn().mockRejectedValue(chunkError());

        await expect(loadChunk(factory)).rejects.toThrow(/Failed to fetch dynamically imported module/);
        expect(reload).not.toHaveBeenCalled();
    });

    it('clears the guard after a successful load so the next deploy can reload again', async () => {
        window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
        const factory = vi.fn().mockResolvedValue({ Page: 'component' });

        await loadChunk(factory);

        expect(window.sessionStorage.getItem(CHUNK_RELOAD_FLAG)).toBeNull();
    });

    it('does not reload when sessionStorage is unavailable — Safari private mode', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        const factory = vi.fn().mockRejectedValue(chunkError());

        // Without storage there is no loop protection, so reloading at all would risk a loop.
        await expect(loadChunk(factory)).rejects.toThrow(/Failed to fetch dynamically imported module/);
        expect(reload).not.toHaveBeenCalled();
    });

    it('gives up after the fallback timeout if the reload silently did nothing', async () => {
        vi.useFakeTimers();
        try {
            const factory = vi.fn().mockRejectedValue(chunkError());
            // Attach the rejection handler before advancing, or the rejection lands unhandled.
            const settled = expect(loadChunk(factory)).rejects.toThrow(/Failed to fetch dynamically imported module/);

            await vi.advanceTimersByTimeAsync(RELOAD_FALLBACK_MS);
            await settled;
            expect(reload).toHaveBeenCalledTimes(1);
            // Guard released, so the user's own retry is allowed to reload again.
            expect(window.sessionStorage.getItem(CHUNK_RELOAD_FLAG)).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('rethrows a genuine error from inside the module instead of reloading', async () => {
        const factory = vi.fn().mockRejectedValue(new TypeError('render exploded'));

        await expect(loadChunk(factory)).rejects.toThrow('render exploded');
        expect(factory).toHaveBeenCalledTimes(2);
        expect(reload).not.toHaveBeenCalled();
    });
});
