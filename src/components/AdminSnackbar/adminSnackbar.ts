export type AdminSnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

export type AdminSnackbarNotification = {
    key?: string;
    severity: AdminSnackbarSeverity;
    message: string;
    /** Persistent notices are closed only by the user or a state change. */
    persistent?: boolean;
    onClose?: () => void;
};

type SnackbarEvent =
    | { type: 'show'; notification: AdminSnackbarNotification }
    | { type: 'clear'; key?: string };

type Listener = (event: SnackbarEvent) => void;

const listeners = new Set<Listener>();
let pendingNotification: AdminSnackbarNotification | null = null;

/**
 * Public, framework-neutral notification seam for request helpers and React
 * screens. The provider owns rendering; callers never touch a UI singleton.
 */
export const showAdminSnackbar = (notification: AdminSnackbarNotification) => {
    pendingNotification = notification;
    listeners.forEach((listener) => listener({ type: 'show', notification }));
};

/** Clears a visible notification when the server state that caused it changed. */
export const clearVisibleAdminSnackbar = (key?: string) => {
    if (!key || pendingNotification?.key === key) pendingNotification = null;
    listeners.forEach((listener) => listener({ type: 'clear', key }));
};

export const subscribeToAdminSnackbar = (listener: Listener) => {
    listeners.add(listener);
    if (pendingNotification) listener({ type: 'show', notification: pendingNotification });
    return () => {
        listeners.delete(listener);
    };
};

/** Test-only cleanup for the public event boundary. */
export const clearAdminSnackbar = () => {
    pendingNotification = null;
    listeners.clear();
};
