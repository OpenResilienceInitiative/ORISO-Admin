/**
 * How the admin interface groups the server's deletion lifecycle states (ORISO-Admin#1521).
 * Anything after the admin's "delete" shows as in deletion until the nightly job removes the row.
 */
export type AdviceSeekerStatus = 'active' | 'inDeletion' | 'deletionFailed' | 'reactivating';

const IN_DELETION = new Set([
    'PENDING_DELETION',
    'READ_ONLY_SAFEGUARD',
    'HARD_DELETE_IN_PROGRESS',
    'HARD_DELETED',
    'MARKED_FOR_DELETION',
]);

const REACTIVATING = new Set(['REACTIVATION_IN_PROGRESS', 'REACTIVATION_REPAIR_REQUIRED']);

export const adviceSeekerStatus = ({
    deletionState,
    deleteDate,
}: {
    deletionState?: string;
    deleteDate?: string;
}): AdviceSeekerStatus => {
    if (deletionState === 'HARD_DELETE_PARTIAL_FAILURE') return 'deletionFailed';
    if (deletionState && REACTIVATING.has(deletionState)) return 'reactivating';
    if ((deletionState && IN_DELETION.has(deletionState)) || deleteDate) return 'inDeletion';
    return 'active';
};

/**
 * Only an active entry the server would accept can be marked: the others are already on their way
 * out or back, and a technical account of an existing Träger goes with the Träger.
 */
export const canMarkForDeletion = (seeker: { deletionState?: string; deleteDate?: string; deletable?: boolean }) =>
    adviceSeekerStatus(seeker) === 'active' && seeker.deletable !== false;
