import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTutorialProgress } from '../../api/tutorial/getTutorialProgress';
import { upsertTutorialProgress } from '../../api/tutorial/upsertTutorialProgress';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';

vi.mock('../../api/tutorial/getTutorialProgress', () => ({
    getTutorialProgress: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../api/tutorial/upsertTutorialProgress', () => ({
    upsertTutorialProgress: vi.fn(() => Promise.resolve({})),
}));

afterEach(() => {
    vi.clearAllMocks();
});

describe('versionedTourProgressRepository (admin)', () => {
    it('persists progress through the versioned userservice api with the admin surface', async () => {
        await versionedTourProgressRepository.saveProgress({
            tourId: 'admin-demo-tour',
            tourVersion: 1,
            status: 'in_progress',
            currentStepId: 'navigation',
        });

        expect(upsertTutorialProgress).toHaveBeenCalledWith({
            surface: 'admin',
            tourId: 'admin-demo-tour',
            tourVersion: 1,
            status: 'in_progress',
            currentStepId: 'navigation',
        });
    });

    it('reads the admin-surface progress list', async () => {
        await versionedTourProgressRepository.getProgress();

        expect(getTutorialProgress).toHaveBeenCalledWith('admin');
    });

    it('rejects on write failure instead of swallowing it', async () => {
        vi.mocked(upsertTutorialProgress).mockRejectedValueOnce(new Error('offline'));

        await expect(
            versionedTourProgressRepository.saveProgress({
                tourId: 'admin-demo-tour',
                tourVersion: 1,
                status: 'completed',
            }),
        ).rejects.toThrow('offline');
    });
});
