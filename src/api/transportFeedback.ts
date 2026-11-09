import type { ReactNode } from 'react';
import { snackbar } from '../components/Snackbar/snackbarStore';

/** What `fetchData` reports when a request fails in a way the person should hear about. */
export interface TransportNotice {
    /** Already translated (`message.error.*`), never a raw server string. */
    content: ReactNode;
    /** Seconds, 0 = until closed. */
    duration?: number;
    /** Same key = same message. Concurrent failures with one cause (an expired session) share one. */
    key?: string;
}

export type TransportFeedback = (notice: TransportNotice) => void;

const ignore: TransportFeedback = () => undefined;

/**
 * Feedback sink for one request. Failures go to the central snackbar channel, which collapses
 * identical messages, so two requests failing for the same reason can never show two snackbars.
 * Outside a browser (SSR, node tests) there is nothing to show and the original rejection is
 * all that matters.
 */
export const captureTransportFeedback = (): TransportFeedback => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return ignore;
    return (notice) => {
        snackbar.error(notice);
    };
};
