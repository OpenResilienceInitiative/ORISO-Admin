import type { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';
import { adminTours } from '../../components/productTour/tourDefinitions';
import type { TourAudience } from '../../components/productTour/types';

/**
 * Pure mapping from the UserService tutorial statistics response to table rows. One
 * row per tenant × surface × tour × version with the per-status counts folded in.
 * Only aggregate counts are handled — the API contract has no per-user records.
 */

export interface TutorialStatisticRow {
    key: string;
    tenantId: number | null;
    surface: string;
    tourId: string;
    tourVersion: number;
    /** Audience ids derived from the known tour definitions; empty when unknown. */
    audiences: TourAudience[];
    notStarted: number;
    inProgress: number;
    completed: number;
    skipped: number;
    total: number;
    completionPercent: number;
}

/**
 * Audiences are tour-definition metadata and are not persisted per progress row
 * (approved TOUR-03 contract), so they are derived client-side from the tour id.
 * Frontend tours are mirrored here because their definitions live in ORISO-Frontend
 * (`src/components/productTour/tourDefinitions.ts`); admin tours come straight from
 * this app's definitions.
 */
const frontendTourAudiencesById: Record<string, TourAudience[]> = {
    'consultant-walkthrough': ['consultant'],
};

const knownTourAudiencesById: Record<string, TourAudience[]> = {
    ...frontendTourAudiencesById,
    ...Object.fromEntries(adminTours.map((tour) => [tour.id, tour.audiences])),
};

const statusFields = {
    not_started: 'notStarted',
    in_progress: 'inProgress',
    completed: 'completed',
    skipped: 'skipped',
} as const;

export const buildTutorialStatisticRows = (
    response: TutorialStatisticsResponse | undefined,
): TutorialStatisticRow[] => {
    if (!response || !Array.isArray(response.tenants)) {
        return [];
    }

    const rowsByKey = new Map<string, TutorialStatisticRow>();
    response.tenants.forEach((tenant) => {
        (tenant.counts || []).forEach((count) => {
            const key = `${tenant.tenantId ?? 'none'}/${count.surface}/${count.tourId}/v${count.tourVersion}`;
            const row = rowsByKey.get(key) || {
                key,
                tenantId: tenant.tenantId,
                surface: count.surface,
                tourId: count.tourId,
                tourVersion: count.tourVersion,
                audiences: knownTourAudiencesById[count.tourId] || [],
                notStarted: 0,
                inProgress: 0,
                completed: 0,
                skipped: 0,
                total: 0,
                completionPercent: 0,
            };

            const statusField = statusFields[count.status];
            if (statusField) {
                row[statusField] += count.total;
            }
            row.total += count.total;
            rowsByKey.set(key, row);
        });
    });

    return [...rowsByKey.values()]
        .map((row) => ({
            ...row,
            completionPercent: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
        }))
        .sort(
            (left, right) =>
                (left.tenantId ?? Number.MAX_SAFE_INTEGER) - (right.tenantId ?? Number.MAX_SAFE_INTEGER) ||
                left.tourId.localeCompare(right.tourId) ||
                left.tourVersion - right.tourVersion,
        );
};
