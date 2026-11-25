import { useCallback, useRef, useState } from 'react';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import type { CaseSharingMode } from './caseSharingMode';

type Pending = { scope: string; id: number; value: PolicyValue<CaseSharingMode> };

/**
 * ORISO-TenantService#374: shows a case sharing choice as soon as it is queued, so a second click
 * while the first save is running compares against the new choice, not the last confirmed one.
 * The pending choice clears when its own save settles (the confirmed answer then shows); a later
 * choice keeps showing until its save settles too.
 *
 * `scope` names the edited resource (Träger or Beratungsstelle id). The page is reused when the
 * route id changes, so a choice queued for one resource never shows on another.
 */
export const usePendingCaseSharing = (scope: string) => {
    const [pending, setPending] = useState<Pending>();
    const latest = useRef(0);
    const track = useCallback(
        (next: PolicyValue<CaseSharingMode>, saved: Promise<unknown>) => {
            latest.current += 1;
            const id = latest.current;
            setPending({ scope, id, value: next });
            const settle = () => setPending((current) => (current?.id === id ? undefined : current));
            saved.then(settle, settle);
        },
        [scope],
    );
    return { pending: pending?.scope === scope ? pending.value : undefined, track };
};
