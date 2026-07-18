import { describe, expect, it } from 'vitest';
import { inMemoryTourProgressRepository } from './tourProgressRepository';
import type { TourProgress } from './types';

const progress = (over: Partial<TourProgress> = {}): TourProgress => ({
    tourId: 'admin-tour',
    tourVersion: 1,
    status: 'in_progress',
    ...over,
});

describe('inMemoryTourProgressRepository', () => {
    it('stores and returns progress per tour id and version', async () => {
        const repo = inMemoryTourProgressRepository();

        await repo.saveProgress(progress({ status: 'completed' }));

        expect(await repo.getProgress('admin-tour', 1)).toMatchObject({
            status: 'completed',
        });
    });

    it('scopes progress by tour version', async () => {
        const repo = inMemoryTourProgressRepository();

        await repo.saveProgress(progress({ status: 'completed' }));

        expect(await repo.getProgress('admin-tour', 2)).toBeNull();
    });

    it('overwrites earlier progress for the same scope', async () => {
        const repo = inMemoryTourProgressRepository();

        await repo.saveProgress(progress({ status: 'in_progress' }));
        await repo.saveProgress(progress({ status: 'skipped' }));

        expect(await repo.getProgress('admin-tour', 1)).toMatchObject({
            status: 'skipped',
        });
    });
});
