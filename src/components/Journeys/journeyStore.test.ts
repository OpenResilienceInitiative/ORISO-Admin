import { describe, expect, it } from 'vite-plus/test';
import { standardJourney } from './journey';
import { JourneyConflictError, memoryJourneyStore, saveLayerChanges, savePlatformChanges } from './journeyStore';
import { isDraftId, nextId } from './ids';

const mail = (id: string) => standardJourney('AGENCY_COUNSELLING', id, 1);

describe('saving journeys through the store (#1571)', () => {
    it('saves new and changed journeys and deletes removed ones, each at its loaded version', async () => {
        const store = memoryJourneyStore([mail('a'), mail('b')]);
        const loaded = await store.loadPlatform();
        const renamed = { ...mail('a'), name: 'Neu' };
        const saved = await savePlatformChanges(store, loaded, [renamed, mail('c')]);
        expect(saved.map((entry) => [entry.journey.id, entry.version])).toEqual([
            ['a', 2],
            ['c', 1],
        ]);
        expect((await store.loadPlatform()).map((entry) => entry.journey.id).sort()).toEqual(['a', 'c']);
    });

    it('leaves an unchanged journey alone', async () => {
        const store = memoryJourneyStore([mail('a')]);
        const loaded = await store.loadPlatform();
        expect(await savePlatformChanges(store, loaded, [mail('a')])).toEqual(loaded);
    });

    it('refuses to overwrite what another admin saved meanwhile', async () => {
        const store = memoryJourneyStore([mail('a')]);
        const mine = await store.loadPlatform();
        const theirs = await store.loadPlatform();
        await savePlatformChanges(store, theirs, [{ ...mail('a'), name: 'Theirs' }]);
        await expect(savePlatformChanges(store, mine, [{ ...mail('a'), name: 'Mine' }])).rejects.toBeInstanceOf(
            JourneyConflictError,
        );
    });

    it('writes a Träger layer and removes it once it is empty', async () => {
        const store = memoryJourneyStore([mail('a')]);
        const layer = { journeyId: 'a', level: 'tenant' as const, ownerId: 't1', phases: { flight: [] } };
        const saved = await saveLayerChanges(store, [], [layer]);
        expect(saved).toHaveLength(1);
        expect(await saveLayerChanges(store, saved, [])).toEqual([]);
        expect(await store.loadLayers('tenant', 't1')).toEqual([]);
    });
});

describe('ids issued on saving (#1689)', () => {
    it('replaces the draft ids of a new journey and its references, and answers with them', async () => {
        const store = memoryJourneyStore();
        const draft = standardJourney('AGENCY_COUNSELLING', 'new:journey-x', 1);
        const saved = await store.savePlatform(draft, 0);
        expect(saved.journey.id).toMatch(/^journey-/);
        const stepIds = Object.values(saved.journey.phases).flatMap((steps) => steps.map((step) => step.id));
        expect(stepIds.some((id) => id.startsWith('new:'))).toBe(false);
        expect(await savePlatformChanges(store, await store.loadPlatform(), [saved.journey])).toHaveLength(1);
    });

    it('marks what the editor creates as a draft', () => {
        expect(isDraftId(nextId('step'))).toBe(true);
        expect(isDraftId('standard-AGENCY_COUNSELLING:topic')).toBe(false);
    });
});
