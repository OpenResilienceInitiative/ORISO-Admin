import { useCallback, useSyncExternalStore } from 'react';
import { getSessionAccessToken } from '../../api/auth/tokenSessionStore';
import parseJwt from '../../utils/parseJWT';

const STORAGE_PREFIX = 'oriso.admin.tourLauncher.visible';

export const tourLauncherStorageKey = (userId: string | undefined) => `${STORAGE_PREFIX}.${userId ?? 'anonymous'}`;

/** Keeps a choice for this page session when the browser refuses storage. */
const sessionFallback = new Map<string, boolean>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** Keycloak subject of the signed-in admin; the switch is stored per user. */
export const currentTourLauncherUserId = (): string | undefined => {
    try {
        const subject = parseJwt(getSessionAccessToken() ?? '')?.sub;
        return typeof subject === 'string' && subject !== '' ? subject : undefined;
    } catch {
        return undefined;
    }
};

export const readTourLauncherVisible = (userId: string | undefined): boolean => {
    const key = tourLauncherStorageKey(userId);
    try {
        const stored = window.localStorage.getItem(key);
        if (stored !== null) {
            return stored !== 'false';
        }
    } catch {
        // Private mode or blocked site data: fall through to the session value.
    }
    return sessionFallback.get(key) ?? true;
};

export const writeTourLauncherVisible = (userId: string | undefined, visible: boolean) => {
    const key = tourLauncherStorageKey(userId);
    sessionFallback.set(key, visible);
    try {
        window.localStorage.setItem(key, String(visible));
    } catch {
        // The session fallback above still applies the choice on this page.
    }
    notify();
};

/** Test helper. */
export const resetTourLauncherPreference = () => {
    sessionFallback.clear();
    notify();
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    // Another tab of the same admin changed the switch.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
};

/**
 * Per-user "Rundgang-Knopf anzeigen" switch (default on), stored in this
 * browser only. Cross-device storage is a follow-up (plan 3.6).
 */
export const useTourLauncherVisible = (): [boolean, (visible: boolean) => void] => {
    const userId = currentTourLauncherUserId();
    const getSnapshot = useCallback(() => readTourLauncherVisible(userId), [userId]);
    const visible = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const setVisible = useCallback((next: boolean) => writeTourLauncherVisible(userId, next), [userId]);
    return [visible, setVisible];
};
