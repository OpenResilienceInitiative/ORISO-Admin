import type { IdAllocationClient, IdAllocationState } from '../../api/idAllocation/idAllocation';
import type { IdUnitOption } from '../../components/IdAllocationField';

/* Shared fixtures of the invite form stories (bar and card). */

/**
 * Stubbed allocation client (#570 worked example): ids 1–20 assigned, 30–35
 * reserved. Auto adopts 21, stepping skips the taken ranges, typing 30 blocks.
 */
const TAKEN_TENANT_IDS = new Set<number>([...Array.from({ length: 20 }, (_, i) => i + 1), 30, 31, 32, 33, 34, 35]);
// Agencies: 1–140 exist, 150–152 are held by open invites — the next free agency number is 141.
const TAKEN_AGENCY_IDS = new Set<number>([...Array.from({ length: 140 }, (_, i) => i + 1), 150, 151, 152]);

const stubbedAllocation = (taken: Set<number>, reserved: (id: number) => boolean): IdAllocationClient => ({
    checkIdAvailability: async (id) => {
        let state: IdAllocationState = 'FREE';
        if (taken.has(id)) state = reserved(id) ? 'RESERVED' : 'ASSIGNED';
        return { id, state };
    },
    nextFreeId: async ({ from, direction }) => {
        let candidate = from == null ? 1 : from + (direction === 'up' ? 1 : -1);
        while (candidate >= 1 && candidate <= 999) {
            if (!taken.has(candidate)) return { id: candidate };
            candidate += direction === 'up' ? 1 : -1;
        }
        return { id: null };
    },
});

export const stubbedTenantIdAllocation = stubbedAllocation(TAKEN_TENANT_IDS, (id) => id >= 30 && id <= 35);
export const stubbedAgencyIdAllocation = stubbedAllocation(TAKEN_AGENCY_IDS, (id) => id >= 150 && id <= 152);

export const TENANTS: IdUnitOption[] = [
    { id: 7, name: 'Caritas Südbaden' },
    { id: 12, name: 'Diakonie Ortenau' },
    { id: 15, name: 'AWO Freiburg' },
];

export const AGENCIES: Array<IdUnitOption & { tenantId: number }> = [
    { id: 101, tenantId: 7, name: 'Caritas Suchtberatung Freiburg', topics: ['Sucht', 'Glücksspiel'] },
    { id: 102, tenantId: 7, name: 'Caritas Schuldnerberatung Lörrach', topics: ['Schulden'] },
    { id: 118, tenantId: 12, name: 'Diakonie Jugendberatung Offenburg', topics: ['U25', 'Familie'] },
    { id: 130, tenantId: 15, name: 'AWO Migrationsberatung', topics: ['Migration'] },
];

export const matches = (unit: IdUnitOption, query: string) =>
    query === '' ||
    `${unit.id} ${unit.name ?? ''} ${(unit.topics ?? []).join(' ')}`.toLowerCase().includes(query.toLowerCase());

export const searchTenants = async (query: string) => TENANTS.filter((tenant) => matches(tenant, query));

export const searchAgencies = async (query: string, { tenantId }: { tenantId?: number }) =>
    AGENCIES.filter((agency) => (tenantId == null || agency.tenantId === tenantId) && matches(agency, query)).map(
        ({ tenantId: _tenantId, ...agency }) => agency,
    );
