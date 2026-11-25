import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { tourLaunchStore, useTourLaunchState } from './tourLaunchStore';

afterEach(() => {
    tourLaunchStore.reset();
});

describe('tourLaunchStore', () => {
    it('starts without a launch request', () => {
        expect(tourLaunchStore.getSnapshot().request).toBeNull();
        expect(tourLaunchStore.getSnapshot().progressRevision).toBe(0);
    });

    it('records a launch request and notifies subscribers', () => {
        const listener = vi.fn();
        const unsubscribe = tourLaunchStore.subscribe(listener);

        tourLaunchStore.requestLaunch('admin-introduction');

        expect(listener).toHaveBeenCalledTimes(1);
        expect(tourLaunchStore.getSnapshot().request?.tourId).toBe('admin-introduction');
        unsubscribe();
    });

    it('gives a repeated request of the same tour a fresh identity, so the host remounts it', () => {
        tourLaunchStore.requestLaunch('admin-introduction');
        const first = tourLaunchStore.getSnapshot().request?.requestedAt;
        tourLaunchStore.requestLaunch('admin-introduction');

        expect(tourLaunchStore.getSnapshot().request?.requestedAt).not.toBe(first);
    });

    it('bumps the progress revision when a tour finishes, but not when it is cancelled', () => {
        tourLaunchStore.requestLaunch('admin-introduction');
        tourLaunchStore.finish();
        expect(tourLaunchStore.getSnapshot()).toMatchObject({ request: null, progressRevision: 1 });

        tourLaunchStore.requestLaunch('admin-introduction');
        tourLaunchStore.cancel();
        expect(tourLaunchStore.getSnapshot()).toMatchObject({ request: null, progressRevision: 1 });
    });

    it('exposes the state to React through useSyncExternalStore', () => {
        const { result } = renderHook(() => useTourLaunchState());
        expect(result.current.request).toBeNull();

        act(() => tourLaunchStore.requestLaunch('admin-introduction'));

        expect(result.current.request?.tourId).toBe('admin-introduction');
    });
});
