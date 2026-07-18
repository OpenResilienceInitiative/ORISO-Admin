import type { TourProgress } from './types';

export interface TourProgressRepository {
    /**
     * Persists tour progress. Rejects on write failure so callers never
     * report a completion the server has not accepted.
     */
    saveProgress(progress: TourProgress): Promise<void>;
    getProgress(tourId: string, tourVersion: number): Promise<TourProgress | null>;
}

/**
 * Session-local repository used by Storybook and tests until the versioned
 * UserService progress API lands (epic packages TOUR-03/TOUR-05). Progress is
 * keyed by tour id + version — a newer tour version is a fresh scope.
 */
export const inMemoryTourProgressRepository = (): TourProgressRepository => {
    const store = new Map<string, TourProgress>();
    const key = (tourId: string, tourVersion: number) => `${tourId}@${tourVersion}`;

    return {
        async saveProgress(progress: TourProgress): Promise<void> {
            store.set(key(progress.tourId, progress.tourVersion), progress);
        },
        async getProgress(
            tourId: string,
            tourVersion: number
        ): Promise<TourProgress | null> {
            return store.get(key(tourId, tourVersion)) ?? null;
        },
    };
};
