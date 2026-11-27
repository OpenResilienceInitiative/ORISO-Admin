import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    readTourLauncherVisible,
    resetTourLauncherPreference,
    tourLauncherStorageKey,
    useTourLauncherVisible,
    writeTourLauncherVisible,
} from './tourLauncherPreference';

afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    resetTourLauncherPreference();
});

describe('tour launcher preference', () => {
    it('defaults to visible', () => {
        expect(readTourLauncherVisible('user-a')).toBe(true);
    });

    it('stores the switch per user', () => {
        writeTourLauncherVisible('user-a', false);

        expect(window.localStorage.getItem(tourLauncherStorageKey('user-a'))).toBe('false');
        expect(readTourLauncherVisible('user-a')).toBe(false);
        expect(readTourLauncherVisible('user-b')).toBe(true);
    });

    it('stays usable when storage throws (private mode, blocked site data)', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(readTourLauncherVisible('user-a')).toBe(true);
        expect(() => writeTourLauncherVisible('user-a', false)).not.toThrow();
        // The choice still holds for this page session.
        expect(readTourLauncherVisible('user-a')).toBe(false);
    });

    it('updates every subscribed component when the switch changes', () => {
        const { result } = renderHook(() => useTourLauncherVisible());
        expect(result.current[0]).toBe(true);

        act(() => result.current[1](false));

        expect(result.current[0]).toBe(false);
    });
});
