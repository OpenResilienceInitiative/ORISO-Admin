import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ report: vi.fn(), getSessionAccessToken: vi.fn() }));

vi.mock('../api/user/reportAccountInactivityActivity', () => ({
    reportAccountInactivityActivity: mocks.report,
}));
vi.mock('../api/auth/tokenSessionStore', () => ({ getSessionAccessToken: mocks.getSessionAccessToken }));

import { useAccountInactivityActivity } from './useAccountInactivityActivity.hook';

const tokenFor = (subject: string) => `header.${btoa(JSON.stringify({ sub: subject }))}.signature`;

// The hook only honours trusted events, and jsdom cannot mint one (`isTrusted` is a
// non-configurable own getter). The trust, visibility and focus guards are covered in a real
// browser by `scripts/test-account-inactivity-browser.mjs`; here we drive the registered
// listener directly so the throttling decision can be asserted in the unit suite.
let listeners: EventListener[] = [];

/** Let the report promise and its finally-handler settle before the next gesture. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const gesture = () => listeners[0]?.({ isTrusted: true } as Event);

describe('useAccountInactivityActivity — a best-effort ping never fires per gesture', () => {
    beforeEach(() => {
        listeners = [];
        const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
        addEventListenerSpy.mockImplementation((type, handler, options) => {
            if (type === 'pointerdown') listeners.push(handler as EventListener);
            EventTarget.prototype.addEventListener.call(document, type, handler, options);
        });
        removeEventListenerSpy.mockImplementation((type, handler, options) => {
            if (type === 'pointerdown') listeners = listeners.filter((entry) => entry !== handler);
            EventTarget.prototype.removeEventListener.call(document, type, handler, options);
        });

        mocks.report.mockReset();
        mocks.getSessionAccessToken.mockReset();
        mocks.getSessionAccessToken.mockReturnValue(tokenFor('person-a'));
        vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('reports the first deliberate gesture', async () => {
        mocks.report.mockResolvedValue(204);
        renderHook(() => useAccountInactivityActivity());

        gesture();
        await settle();

        expect(mocks.report).toHaveBeenCalledTimes(1);
    });

    it('makes no second request within the interval after a 403', async () => {
        // The endpoint only exists on an unmerged UserService branch; staging answers 403, which
        // was not in the old "unavailable" list — so every single gesture fired a request.
        mocks.report.mockResolvedValue(403);
        renderHook(() => useAccountInactivityActivity());

        gesture();
        await settle();
        gesture();
        gesture();
        await settle();

        expect(mocks.report).toHaveBeenCalledTimes(1);
    });

    it.each([204, 401, 403, 404, 405, 500, 501])(
        'makes no second request within the interval after HTTP %i',
        async (status) => {
            mocks.report.mockResolvedValue(status);
            renderHook(() => useAccountInactivityActivity());

            gesture();
            await settle();
            gesture();
            await settle();

            expect(mocks.report).toHaveBeenCalledTimes(1);
        },
    );

    it('makes no second request within the interval after a failed request', async () => {
        mocks.report.mockRejectedValue(new Error('offline'));
        renderHook(() => useAccountInactivityActivity());

        gesture();
        await settle();
        gesture();
        await settle();

        expect(mocks.report).toHaveBeenCalledTimes(1);
    });

    it('never reports twice while the first report is still in flight', async () => {
        mocks.report.mockReturnValue(new Promise(() => undefined));
        renderHook(() => useAccountInactivityActivity());

        gesture();
        gesture();
        await settle();

        expect(mocks.report).toHaveBeenCalledTimes(1);
    });

    it('reports again for a different account instead of inheriting the throttle', async () => {
        mocks.report.mockResolvedValue(403);
        renderHook(() => useAccountInactivityActivity());

        gesture();
        await settle();
        mocks.getSessionAccessToken.mockReturnValue(tokenFor('person-b'));
        gesture();
        await settle();

        expect(mocks.report).toHaveBeenCalledTimes(2);
    });

    it('reports nothing without a readable subject', async () => {
        mocks.getSessionAccessToken.mockReturnValue(null);
        renderHook(() => useAccountInactivityActivity());

        gesture();
        await settle();

        expect(mocks.report).not.toHaveBeenCalled();
    });

    it('stops listening once the hook unmounts', async () => {
        mocks.report.mockResolvedValue(204);
        const { unmount } = renderHook(() => useAccountInactivityActivity());

        unmount();

        expect(listeners).toHaveLength(0);
    });
});
