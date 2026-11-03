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
    /** True when the backend hid the group (too few people). All figures are null then, never 0. */
    suppressed: boolean;
    notStarted: number | null;
    inProgress: number | null;
    completed: number | null;
    skipped: number | null;
    total: number | null;
    completionPercent: number | null;
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

type Counted = Pick<TutorialStatisticRow, 'notStarted' | 'inProgress' | 'completed' | 'skipped' | 'total'>;
type Counter = { [Field in keyof Counted]: number } & { suppressed: boolean };

export const buildTutorialStatisticRows = (
    response: TutorialStatisticsResponse | undefined,
): TutorialStatisticRow[] => {
    if (!response || !Array.isArray(response.tenants)) {
        return [];
    }

    const rowsByKey = new Map<string, { row: TutorialStatisticRow; counter: Counter }>();
    response.tenants.forEach((tenant) => {
        (tenant.counts || []).forEach((count) => {
            const key = `${tenant.tenantId ?? 'none'}/${count.surface}/${count.tourId}/v${count.tourVersion}`;
            const entry = rowsByKey.get(key) || {
                row: {
                    key,
                    tenantId: tenant.tenantId,
                    surface: count.surface,
                    tourId: count.tourId,
                    tourVersion: count.tourVersion,
                    audiences: knownTourAudiencesById[count.tourId] || [],
                    suppressed: false,
                    notStarted: 0,
                    inProgress: 0,
                    completed: 0,
                    skipped: 0,
                    total: 0,
                    completionPercent: 0,
                },
                counter: { suppressed: false, notStarted: 0, inProgress: 0, completed: 0, skipped: 0, total: 0 },
            };

            // A hidden group carries no status and a total of 0: neither may be added up or shown.
            if (count.suppressed) {
                entry.counter.suppressed = true;
            } else {
                const statusField = count.status ? statusFields[count.status] : undefined;
                if (statusField) {
                    entry.counter[statusField] += count.total;
                }
                entry.counter.total += count.total;
            }
            rowsByKey.set(key, entry);
        });
    });

    return [...rowsByKey.values()]
        .map(({ row, counter }): TutorialStatisticRow => {
            if (counter.suppressed) {
                return {
                    ...row,
                    suppressed: true,
                    notStarted: null,
                    inProgress: null,
                    completed: null,
                    skipped: null,
                    total: null,
                    completionPercent: null,
                };
            }

            return {
                ...row,
                ...counter,
                completionPercent: counter.total > 0 ? Math.round((counter.completed / counter.total) * 100) : 0,
            };
        })
        .sort(
            (left, right) =>
                (left.tenantId ?? Number.MAX_SAFE_INTEGER) - (right.tenantId ?? Number.MAX_SAFE_INTEGER) ||
                left.tourId.localeCompare(right.tourId) ||
                left.tourVersion - right.tourVersion,
        );
};
