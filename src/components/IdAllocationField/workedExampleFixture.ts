import type { IdAllocationClient, IdAllocationState } from '../../api/idAllocation/idAllocation';

const TAKEN_IDS = new Set<number>([...Array.from({ length: 20 }, (_, index) => index + 1), 30, 31, 32, 33, 34, 35]);

const stateOf = (id: number): IdAllocationState => {
    if (!TAKEN_IDS.has(id)) return 'FREE';
    return id >= 30 && id <= 35 ? 'RESERVED' : 'ASSIGNED';
};

/** Shared #570 worked example used by the field and composer stories. */
export const workedExampleIdAllocationClient: IdAllocationClient = {
    checkIdAvailability: async (id) => ({ id, state: stateOf(id) }),
    nextFreeId: async ({ from, direction }) => {
        let candidate = from == null ? 1 : from + (direction === 'up' ? 1 : -1);
        while (candidate >= 1 && candidate <= 999) {
            if (!TAKEN_IDS.has(candidate)) return { id: candidate };
            candidate += direction === 'up' ? 1 : -1;
        }
        return { id: null };
    },
    reserveId: async ({ id }) => ({ id: id ?? 21 }),
    releaseId: async () => {},
};
