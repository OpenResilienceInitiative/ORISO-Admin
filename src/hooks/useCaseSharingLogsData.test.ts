import { describe, expect, it } from 'vite-plus/test';
import { caseSharingChangesEndpoint } from '../appConfig';
import { caseSharingLogsUrl, toCaseSharingChanges } from './useCaseSharingLogsData';

describe('caseSharingLogsUrl', () => {
    it('targets the AgencyService agencyadmin endpoint', () => {
        expect(caseSharingChangesEndpoint).toMatch(/\/service\/agencyadmin\/agencies\/case-sharing-changes$/);
    });

    it('turns the 1-based table page into the 0-based backend page', () => {
        expect(caseSharingLogsUrl({ page: 1, perPage: 20 })).toBe(`${caseSharingChangesEndpoint}?page=0&perPage=20`);
        expect(caseSharingLogsUrl({ page: 3, perPage: 30 })).toBe(`${caseSharingChangesEndpoint}?page=2&perPage=30`);
    });

    it('adds the optional agency and keeps perPage within 1..100', () => {
        expect(caseSharingLogsUrl({ page: 1, perPage: 500, agencyId: ' 5 ' })).toBe(
            `${caseSharingChangesEndpoint}?agencyId=5&page=0&perPage=100`,
        );
        expect(caseSharingLogsUrl({ page: 0, perPage: 0, agencyId: '' })).toBe(
            `${caseSharingChangesEndpoint}?page=0&perPage=1`,
        );
    });
});

describe('toCaseSharingChanges', () => {
    it('keeps entries and total from the backend', () => {
        const entry = {
            id: 1,
            agencyId: 5,
            agencyName: 'Beratungsstelle Mitte',
            tenantId: 1,
            changedAt: '2026-11-25T09:00:00Z',
            changedBy: null,
            previousModel: null,
            newModel: 'TEAM_COUNSELLING',
            source: 'AGENCY_SETTINGS',
        };
        expect(toCaseSharingChanges({ total: 7, entries: [entry] })).toEqual({ total: 7, entries: [entry] });
    });

    it('reads an empty or partial body as no changes', () => {
        expect(toCaseSharingChanges(undefined)).toEqual({ total: 0, entries: [] });
        expect(toCaseSharingChanges({})).toEqual({ total: 0, entries: [] });
    });
});
