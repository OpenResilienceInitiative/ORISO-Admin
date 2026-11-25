import { useSyncExternalStore } from 'react';

export interface TourLaunchRequest {
    tourId: string;
    /** Unique per request: a restart of the same tour remounts the adapter. */
    requestedAt: number;
}

export interface TourLaunchState {
    /** The tour the global host should run; null while no tour runs. */
    request: TourLaunchRequest | null;
    /** Bumped after a tour reached a terminal status, so progress readers reload. */
    progressRevision: number;
}

const initialState: TourLaunchState = { request: null, progressRevision: 0 };

let state: TourLaunchState = initialState;
let lastRequestedAt = 0;
const listeners = new Set<() => void>();

const setState = (next: TourLaunchState) => {
    state = next;
    listeners.forEach((listener) => listener());
};

/**
 * Module store for the Admin tour host (Admin has no jotai). The profile card
 * and the "?" launcher only request a launch; `TourHost` in the protected
 * layout owns the running tour, so it survives route changes.
 */
export const tourLaunchStore = {
    getSnapshot: (): TourLaunchState => state,
    subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    requestLaunch: (tourId: string) => {
        lastRequestedAt = Math.max(Date.now(), lastRequestedAt + 1);
        setState({ ...state, request: { tourId, requestedAt: lastRequestedAt } });
    },
    /** The tour reached completed/skipped: release the host and reload progress. */
    finish: () => setState({ request: null, progressRevision: state.progressRevision + 1 }),
    /** The tour closed without a terminal status (or is unknown): release the host only. */
    cancel: () => setState({ ...state, request: null }),
    /** Test helper. */
    reset: () => {
        lastRequestedAt = 0;
        setState(initialState);
    },
};

export const useTourLaunchState = (): TourLaunchState =>
    useSyncExternalStore(tourLaunchStore.subscribe, tourLaunchStore.getSnapshot, tourLaunchStore.getSnapshot);
