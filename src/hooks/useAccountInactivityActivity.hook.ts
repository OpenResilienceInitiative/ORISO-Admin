import { useEffect } from 'react';
import { getSessionAccessToken } from '../api/auth/tokenSessionStore';
import { reportAccountInactivityActivity } from '../api/user/reportAccountInactivityActivity';
import parseJwt from '../utils/parseJWT';

const REPORT_INTERVAL_MS = 60_000;
interface AccountReportState {
    subject: string;
    throttledAt: number | null;
    pending?: AbortController;
}

/** Reports deliberate use, never elapsed time, polling or refreshed credentials. */
export const useAccountInactivityActivity = () => {
    useEffect(() => {
        let account: AccountReportState | undefined;
        let disposed = false;
        const reportGesture = (event: Event) => {
            if (!event.isTrusted || document.visibilityState !== 'visible' || !document.hasFocus()) return;
            const token = getSessionAccessToken();
            const subject = parseJwt(token)?.sub;
            if (typeof subject !== 'string' || !subject) {
                account?.pending?.abort();
                account = undefined;
                return;
            }
            if (account?.subject !== subject) {
                account?.pending?.abort();
                account = { subject, throttledAt: null };
            }
            if (
                account.pending ||
                (account.throttledAt !== null && Date.now() - account.throttledAt < REPORT_INTERVAL_MS)
            )
                return;
            const currentAccount = account;
            const controller = new AbortController();
            currentAccount.pending = controller;
            reportAccountInactivityActivity(token, controller.signal)
                .catch(() => undefined)
                .finally(() => {
                    // An abort always lands here too, but only after `account` was reassigned or
                    // the effect was disposed — so an aborted report never starts the window.
                    if (disposed || account !== currentAccount) return;
                    // Whatever the attempt produced — 204, a status that says the endpoint is
                    // missing (404/405/501) or not permitted for this account (401/403), any
                    // other error, or a failed request — the next report waits a full interval.
                    // This ping is best-effort and must never cost a request per gesture: only
                    // 404, 405 and 501 used to throttle, so the 403 staging returns (the
                    // endpoint lives on an unmerged UserService branch) made every single
                    // pointerdown and keydown fire one.
                    currentAccount.throttledAt = Date.now();
                    currentAccount.pending = undefined;
                });
        };
        document.addEventListener('pointerdown', reportGesture, true);
        document.addEventListener('keydown', reportGesture, true);
        return () => {
            disposed = true;
            document.removeEventListener('pointerdown', reportGesture, true);
            document.removeEventListener('keydown', reportGesture, true);
            account?.pending?.abort();
        };
    }, []);
};
