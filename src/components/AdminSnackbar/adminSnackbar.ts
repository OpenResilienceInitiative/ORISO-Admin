export type AdminSnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

export type AdminSnackbarNotification = {
    key?: string;
    severity: AdminSnackbarSeverity;
    message: string;
    /** Persistent notices are closed only by the user or a state change. */
    persistent?: boolean;
};

type Listener = (notification: AdminSnackbarNotification) => void;

const listeners = new Set<Listener>();

/**
 * Public, framework-neutral notification seam for request helpers and React
 * screens. The provider owns rendering; callers never touch a UI singleton.
 */
export const showAdminSnackbar = (notification: AdminSnackbarNotification) => {
    listeners.forEach((listener) => listener(notification));
};

export const subscribeToAdminSnackbar = (listener: Listener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** Test-only cleanup for the public event boundary. */
export const clearAdminSnackbar = () => listeners.clear();
