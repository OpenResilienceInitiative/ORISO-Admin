import { describe, expect, it } from 'vitest';
import { buildTutorialStatisticRows } from './tutorialStatisticsData';
import type { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';

const response = (overrides: Partial<TutorialStatisticsResponse> = {}): TutorialStatisticsResponse => ({
    generatedAt: '2026-07-19T10:00:00Z',
    scope: 'TENANT',
    tenants: [],
    ...overrides,
});

describe('buildTutorialStatisticRows', () => {
    it('returns no rows without a response', () => {
        expect(buildTutorialStatisticRows(undefined)).toEqual([]);
    });

    it('tolerates a malformed response without a tenants array', () => {
        expect(buildTutorialStatisticRows({} as TutorialStatisticsResponse)).toEqual([]);
    });

    it('groups the per-status counts of one tour version into a single row', () => {
        const rows = buildTutorialStatisticRows(
            response({
                tenants: [
                    {
                        tenantId: 2,
                        counts: [
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: 'completed',
                                total: 6,
                            },
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: 'in_progress',
                                total: 3,
                            },
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: 'skipped',
                                total: 1,
                            },
                        ],
                    },
                ],
            }),
        );

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            tenantId: 2,
            surface: 'frontend',
            tourId: 'consultant-walkthrough',
            tourVersion: 1,
            completed: 6,
            inProgress: 3,
            skipped: 1,
            notStarted: 0,
            total: 10,
            completionPercent: 60,
        });
    });

    it('keeps separate rows per tenant, tour and version, ordered by tenant then tour', () => {
        const rows = buildTutorialStatisticRows(
            response({
                scope: 'PLATFORM',
                tenants: [
                    {
                        tenantId: 3,
                        counts: [
                            {
                                surface: 'admin',
                                tourId: 'admin-demo-tour',
                                tourVersion: 1,
                                status: 'completed',
                                total: 2,
                            },
                        ],
                    },
                    {
                        tenantId: 2,
                        counts: [
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 2,
                                status: 'completed',
                                total: 4,
                            },
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: 'skipped',
                                total: 5,
                            },
                        ],
                    },
                ],
            }),
        );

        expect(rows.map((row) => `${row.tenantId}/${row.tourId}/v${row.tourVersion}`)).toEqual([
            '2/consultant-walkthrough/v1',
            '2/consultant-walkthrough/v2',
            '3/admin-demo-tour/v1',
        ]);
    });

    it('derives audiences from the known tour definitions with an empty fallback', () => {
        const rows = buildTutorialStatisticRows(
            response({
                tenants: [
                    {
                        tenantId: 2,
                        counts: [
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: 'completed',
                                total: 1,
                            },
                            {
                                surface: 'admin',
                                tourId: 'unknown-tour',
                                tourVersion: 1,
                                status: 'completed',
                                total: 1,
                            },
                        ],
                    },
                ],
            }),
        );

        expect(rows.find((row) => row.tourId === 'consultant-walkthrough')?.audiences).toEqual(['consultant']);
        expect(rows.find((row) => row.tourId === 'unknown-tour')?.audiences).toEqual([]);
    });

    it('reports a zero completion percentage without dividing by zero', () => {
        const rows = buildTutorialStatisticRows(
            response({
                tenants: [
                    {
                        tenantId: null,
                        counts: [
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: 'not_started',
                                total: 0,
                            },
                        ],
                    },
                ],
            }),
        );

        expect(rows[0].completionPercent).toBe(0);
        expect(rows[0].tenantId).toBeNull();
    });
});
