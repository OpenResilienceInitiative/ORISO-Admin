import { useCallback, useRef, useState } from 'react';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import type { CaseSharingMode } from './caseSharingMode';

/**
 * ORISO-TenantService#374: shows a case sharing choice as soon as it is queued, so a second click
 * while the first save is running compares against the new choice, not the last confirmed one.
 * The pending choice clears when its own save settles (the confirmed answer then shows); a later
 * choice keeps showing until its save settles too.
 */
export const usePendingCaseSharing = () => {
    const [pending, setPending] = useState<PolicyValue<CaseSharingMode>>();
    const latest = useRef(0);
    const track = useCallback((next: PolicyValue<CaseSharingMode>, saved: Promise<unknown>) => {
        latest.current += 1;
        const id = latest.current;
        setPending(next);
        const settle = () => {
            if (latest.current === id) setPending(undefined);
        };
        saved.then(settle, settle);
    }, []);
    return { pending, track };
};
