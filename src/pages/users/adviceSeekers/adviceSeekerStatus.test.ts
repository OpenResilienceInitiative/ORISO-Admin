import { describe, expect, it } from 'vite-plus/test';
import { adviceSeekerStatus, canMarkForDeletion } from './adviceSeekerStatus';

describe('adviceSeekerStatus', () => {
    it.each([
        [{ deletionState: 'ACTIVE' }, 'active'],
        [{ deletionState: 'PENDING_DELETION' }, 'inDeletion'],
        [{ deletionState: 'READ_ONLY_SAFEGUARD' }, 'inDeletion'],
        [{ deletionState: 'HARD_DELETE_IN_PROGRESS' }, 'inDeletion'],
        [{ deletionState: 'MARKED_FOR_DELETION' }, 'inDeletion'],
        [{ deletionState: 'HARD_DELETE_PARTIAL_FAILURE' }, 'deletionFailed'],
        [{ deletionState: 'REACTIVATION_IN_PROGRESS' }, 'reactivating'],
        // A delete date wins over a stale or unknown state.
        [{ deletionState: 'ACTIVE', deleteDate: '2026-11-12T22:00:00' }, 'inDeletion'],
        [{ deletionState: 'SOMETHING_NEW' }, 'active'],
    ])('maps %o to %s', (seeker, expected) => {
        expect(adviceSeekerStatus(seeker)).toBe(expected);
    });

    it('only lets active advice seekers be marked', () => {
        expect(canMarkForDeletion({ deletionState: 'ACTIVE' })).toBe(true);
        expect(canMarkForDeletion({ deletionState: 'HARD_DELETE_PARTIAL_FAILURE' })).toBe(false);
        expect(canMarkForDeletion({ deletionState: 'READ_ONLY_SAFEGUARD' })).toBe(false);
    });
});
