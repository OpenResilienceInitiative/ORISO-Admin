import { useEffect, useState } from 'react';
import type { TutorialProgressItem } from '../../api/tutorial/getTutorialProgress';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';

/**
 * The signed-in admin's versioned tour progress; reloads whenever `revision`
 * changes (a tour just finished). Without data every tour reads as not started.
 */
export const useAdminTourProgress = (revision: number, enabled = true): TutorialProgressItem[] => {
    const [progress, setProgress] = useState<TutorialProgressItem[]>([]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        let cancelled = false;
        versionedTourProgressRepository
            .getProgress()
            .then((items) => {
                if (!cancelled) {
                    setProgress(items);
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [enabled, revision]);

    return progress;
};
