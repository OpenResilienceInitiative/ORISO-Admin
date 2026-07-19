import { getTutorialProgress, TutorialProgressItem } from '../../api/tutorial/getTutorialProgress';
import { upsertTutorialProgress } from '../../api/tutorial/upsertTutorialProgress';
import type { TourProgress } from './types';

export interface VersionedTourProgressRepository {
    /**
     * Persists tour progress through the versioned UserService API. Rejects
     * on write failure so callers never report an unaccepted completion.
     */
    saveProgress(progress: TourProgress): Promise<void>;
    getProgress(): Promise<TutorialProgressItem[]>;
}

/** Admin-surface repository backed by /users/tutorials/progress (TOUR-03). */
export const versionedTourProgressRepository: VersionedTourProgressRepository = {
    async saveProgress(progress: TourProgress): Promise<void> {
        await upsertTutorialProgress({
            surface: 'admin',
            tourId: progress.tourId,
            tourVersion: progress.tourVersion,
            status: progress.status,
            currentStepId: progress.currentStepId,
        });
    },
    async getProgress(): Promise<TutorialProgressItem[]> {
        return getTutorialProgress('admin');
    },
};
