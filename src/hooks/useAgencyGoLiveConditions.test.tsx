import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAgencyGoLiveConditions } from './useAgencyGoLiveConditions';
import { AgencyData } from '../types/agency';

const mocks = vi.hoisted(() => ({
    hasConsultants: { data: false, isLoading: false },
    versionsByKind: {
        DPP: { data: [] as unknown[], isLoading: false },
        IMPRINT: { data: [] as unknown[], isLoading: false },
    },
}));

vi.mock('./useAgencyHasConsultants', () => ({
    useAgencyHasConsultants: () => mocks.hasConsultants,
}));

vi.mock('./useLegalTextVersions.hook', () => ({
    useLegalTextVersions: (scope: { kind: 'DPP' | 'IMPRINT' }) => mocks.versionsByKind[scope.kind],
}));

const agency = (overrides: Partial<AgencyData> = {}) =>
    ({
        name: 'Beratungsstelle',
        postcode: '86150',
        city: 'Augsburg',
        topics: [{ id: 1, name: 'Sozialberatung' }],
        content: {},
        ...overrides,
    } as AgencyData);

describe('useAgencyGoLiveConditions', () => {
    beforeEach(() => {
        mocks.hasConsultants = { data: false, isLoading: false };
        mocks.versionsByKind = {
            DPP: { data: [], isLoading: false },
            IMPRINT: { data: [], isLoading: false },
        };
    });

    it('reports every condition open for a fresh agency without team and legal texts', () => {
        const { result } = renderHook(() => useAgencyGoLiveConditions({ id: '7', agencyData: agency({ topics: [] }) }));

        expect(result.current.departmentsDefined).toBe(false);
        expect(result.current.hasTeam).toBe(false);
        expect(result.current.privacyPublished).toBe(false);
        expect(result.current.imprintPublished).toBe(false);
        expect(result.current.allMet).toBe(false);
    });

    it('meets all conditions with team, departments and published versions', () => {
        mocks.hasConsultants = { data: true, isLoading: false };
        mocks.versionsByKind = {
            DPP: { data: [{ id: 1 }], isLoading: false },
            IMPRINT: { data: [{ id: 2 }], isLoading: false },
        };

        const { result } = renderHook(() => useAgencyGoLiveConditions({ id: '7', agencyData: agency() }));

        expect(result.current.allMet).toBe(true);
    });

    it('accepts legacy working-copy legal texts as published (pre-versioning fallback)', () => {
        mocks.hasConsultants = { data: true, isLoading: false };

        const { result } = renderHook(() =>
            useAgencyGoLiveConditions({
                id: '7',
                agencyData: agency({
                    content: { privacy: { de: '<p>Datenschutz</p>' }, impressum: { de: '<p>Impressum</p>' } },
                }),
            }),
        );

        expect(result.current.privacyPublished).toBe(true);
        expect(result.current.imprintPublished).toBe(true);
        expect(result.current.allMet).toBe(true);
    });

    it('flags incomplete master data', () => {
        const { result } = renderHook(() => useAgencyGoLiveConditions({ id: '7', agencyData: agency({ city: '' }) }));

        expect(result.current.masterDataComplete).toBe(false);
        expect(result.current.allMet).toBe(false);
    });
});
