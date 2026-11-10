import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { beginStoryVerification, recordUnexpectedRequest } from '../../.storybook/verification';

import { captureStorybookAnimationCleanup } from '../../.storybook/storybookAnimationCleanup';
import { clearStoryQueryClients, createStoryQueryClient } from '../../.storybook/queryClients';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('story verification lifecycle', () => {
    it('rejects a swallowed console error', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const finish = beginStoryVerification();
        // eslint-disable-next-line no-console -- Negative control exercises intercepted console failures.
        console.error('hidden render failure');
        await expect(finish()).rejects.toThrow('console-error: hidden render failure');
    });

    it('rejects an uncaught browser error', async () => {
        const finish = beginStoryVerification();
        window.dispatchEvent(new ErrorEvent('error', { message: 'uncaught control' }));
        await expect(finish()).rejects.toThrow('uncaught-error: uncaught control');
    });

    it('rejects an unexpected product request even if its rejection is caught', async () => {
        const finish = beginStoryVerification();
        expect(() => recordUnexpectedRequest(new Request('https://example.test/service/tenants'))).toThrow(
            'Unexpected product API request',
        );
        await expect(finish()).rejects.toThrow('unexpected-request: GET https://example.test/service/tenants');
    });

    it('detects a fallback that disappears before story cleanup', async () => {
        const finish = beginStoryVerification();
        const fallback = document.createElement('div');
        fallback.dataset.storyFallback = '';
        document.body.append(fallback);
        await Promise.resolve();
        fallback.remove();
        await expect(finish()).rejects.toThrow('fallback: A failure fallback replaced the story');
    });

    it('restores theme attributes and both storage areas after a failure', async () => {
        const originalStyle = document.documentElement.getAttribute('style');
        localStorage.setItem('existing', 'before');
        const finish = beginStoryVerification();
        document.documentElement.style.setProperty('--primary', '#badbad');
        document.documentElement.dataset.theme = 'inverted';
        localStorage.setItem('existing', 'after');
        sessionStorage.setItem('leaked', 'yes');
        window.dispatchEvent(new ErrorEvent('error', { message: 'controlled error' }));
        await expect(finish()).rejects.toThrow('controlled error');
        expect(document.documentElement.getAttribute('style')).toBe(originalStyle);
        expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
        expect(localStorage.getItem('existing')).toBe('before');
        expect(sessionStorage.getItem('leaked')).toBe(null);
    });

    it('removes console/error hooks and expected-error state between stories', async () => {
        // eslint-disable-next-line no-console -- Assert that the exact original error hook is restored.
        const original = console.error;
        const finish = beginStoryVerification([{ kind: 'uncaught-error', message: 'expected', count: 1 }]);
        window.dispatchEvent(new ErrorEvent('error', { message: 'expected' }));
        await finish();
        // eslint-disable-next-line no-console -- Assert that the exact original error hook is restored.
        expect(console.error).toBe(original);
        const next = beginStoryVerification();
        await expect(next()).resolves.toBeUndefined();
    });
});

describe('awaited story-owned query and handler cleanup', () => {
    it('captures abort-handler console errors through awaited cancellation and restores final state', async () => {
        // eslint-disable-next-line no-console -- Verify exact error-sink restoration after awaited owned cleanup.
        const originalError = console.error;
        const originalStyle = document.documentElement.getAttribute('style');
        localStorage.setItem('existing', 'before');
        const client = createStoryQueryClient();
        let abortWork = Promise.resolve();
        let cancelled = false;
        const pending = client
            .fetchQuery({
                queryKey: ['owned-pending'],
                queryFn: ({ signal }) =>
                    new Promise((resolve) => {
                        signal.addEventListener('abort', () => {
                            cancelled = true;
                            abortWork = Promise.resolve().then(() => {
                                // eslint-disable-next-line no-console -- Deliberate negative control must be forwarded and fail the active recorder.
                                console.error('owned abort cleanup failure');
                                document.documentElement.style.setProperty('--cleanup-leak', 'yes');
                                document.body.dataset.cleanupLeak = 'yes';
                                localStorage.setItem('existing', 'after');
                                sessionStorage.setItem('cleanup-leak', 'yes');
                                resolve(null);
                            });
                        });
                    }),
            })
            .catch(() => undefined);
        const reset = vi.fn();
        const finish = beginStoryVerification([], async () => {
            await clearStoryQueryClients();
            await abortWork;
            reset();
        });
        await expect(Promise.resolve().then(() => finish())).rejects.toThrow(
            'console-error: owned abort cleanup failure',
        );
        await pending;
        expect(cancelled).toBe(true);
        expect(client.getQueryCache().getAll()).toHaveLength(0);
        expect(reset).toHaveBeenCalledTimes(1);
        // eslint-disable-next-line no-console -- Verify that cleanup restores the original sink without suppression.
        expect(console.error).toBe(originalError);
        expect(document.documentElement.getAttribute('style')).toBe(originalStyle);
        expect(document.body.hasAttribute('data-cleanup-leak')).toBe(false);
        expect(localStorage.getItem('existing')).toBe('before');
        expect(sessionStorage.getItem('cleanup-leak')).toBeNull();
        await expect(Promise.resolve().then(() => finish())).resolves.toBeUndefined();
        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('captures a caught unexpected request after an awaited cleanup boundary', async () => {
        const finish = beginStoryVerification([], async () => {
            await Promise.resolve();
            try {
                recordUnexpectedRequest(new Request('https://example.test/service/cleanup'));
            } catch {
                // The request may be locally handled; the recorder must still reject it.
            }
        });
        await expect(Promise.resolve().then(() => finish())).rejects.toThrow(
            'unexpected-request: GET https://example.test/service/cleanup',
        );
        await expect(Promise.resolve().then(() => finish())).resolves.toBeUndefined();
    });

    it('retains both original verification and cleanup failures and does not repeat safety cleanup', async () => {
        const cleanup = vi.fn(async () => {
            throw new Error('owned cancellation rejected');
        });
        const finish = beginStoryVerification([], cleanup);
        window.dispatchEvent(new ErrorEvent('error', { message: 'original render failure' }));
        let failure: unknown;
        try {
            await finish();
        } catch (error) {
            failure = error;
        }
        expect(failure).toBeInstanceOf(AggregateError);
        expect(String(failure)).toContain('original render failure');
        expect(String(failure)).toContain('owned cancellation rejected');
        await expect(Promise.resolve().then(() => finish())).resolves.toBeUndefined();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});

const pinnedPauseStyle = `*, *:before, *:after {
    animation-delay: 0s !important;
    animation-direction: reverse !important;
    animation-play-state: paused !important;
    transition: none !important;
  }`;

describe('pinned Storybook temporary animation style ownership', () => {
    it('releases only current-test pause styles after failed verification and awaited cleanup', async () => {
        const existing = document.createElement('style');
        existing.textContent = pinnedPauseStyle;
        const unrelated = document.createElement('style');
        unrelated.textContent = '.fixture { color: red; }';
        document.head.append(existing, unrelated);
        const owned = document.createElement('style');
        owned.textContent = pinnedPauseStyle;
        let remainedDuringCleanup = false;
        const finish = beginStoryVerification([], async () => {
            await Promise.resolve();
            remainedDuringCleanup = owned.isConnected;
        });
        const newUnrelated = document.createElement('style');
        newUnrelated.textContent = '.another-fixture { opacity: 0.9; }';
        document.head.append(owned, newUnrelated);
        window.dispatchEvent(new ErrorEvent('error', { message: 'original strict test failure' }));
        try {
            await expect(finish()).rejects.toThrow('original strict test failure');
            expect(remainedDuringCleanup).toBe(true);
            expect(owned.isConnected).toBe(false);
            expect(existing.isConnected).toBe(true);
            expect(unrelated.isConnected).toBe(true);
            expect(newUnrelated.isConnected).toBe(true);
            await expect(finish()).resolves.toBeUndefined();
            expect(existing.isConnected).toBe(true);
        } finally {
            existing.remove();
            unrelated.remove();
            owned.remove();
            newUnrelated.remove();
        }
    });
});

it('drains pending added-style records and keeps later-story ownership isolated', async () => {
    const release = captureStorybookAnimationCleanup();
    const pending = document.createElement('style');
    pending.textContent = pinnedPauseStyle;
    document.head.append(pending);
    release();
    expect(pending.isConnected).toBe(false);
    const first = beginStoryVerification();
    await first();
    const second = beginStoryVerification();
    const later = document.createElement('style');
    later.textContent = pinnedPauseStyle;
    document.head.append(later);
    try {
        await first();
        expect(later.isConnected).toBe(true);
        await second();
        expect(later.isConnected).toBe(false);
        release();
    } finally {
        later.remove();
    }
});
