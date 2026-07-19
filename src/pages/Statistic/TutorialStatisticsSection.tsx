import { Alert } from 'antd';
import type { ColumnType } from 'antd/lib/table';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import getTutorialStatistics, { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';
import { FETCH_ERRORS } from '../../api/fetchData';
import { ListingTable } from '../../components/ListingTable';
import { buildTutorialStatisticRows, TutorialStatisticRow } from './tutorialStatisticsData';

export interface TutorialStatisticsSectionProps {
    /** Injectable for tests/Storybook; defaults to the real admin statistics API. */
    loadStatistics?: () => Promise<TutorialStatisticsResponse>;
}

type SectionState =
    | { phase: 'loading' }
    | { phase: 'forbidden' }
    | { phase: 'error' }
    | { phase: 'loaded'; response: TutorialStatisticsResponse };

/**
 * Aggregate tutorial-completion dashboard section (epic TOUR-07). Backend scoping is
 * authoritative: tenant admins receive only their tenant, platform admins global
 * counts per tenant. A 403 renders as an in-place "no access" notice and API
 * failures as a real error state — never as an empty-success table. No per-user
 * tutorial history exists in the API contract or in this view.
 */
export const TutorialStatisticsSection = ({
    loadStatistics = getTutorialStatistics,
}: TutorialStatisticsSectionProps) => {
    const { t } = useTranslation();
    const [state, setState] = useState<SectionState>({ phase: 'loading' });

    useEffect(() => {
        let cancelled = false;
        loadStatistics()
            .then((response) => {
                if (!cancelled) {
                    setState({ phase: 'loaded', response });
                }
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return;
                }
                const isForbidden = error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN;
                setState({ phase: isForbidden ? 'forbidden' : 'error' });
            });
        return () => {
            cancelled = true;
        };
    }, [loadStatistics]);

    const rows = useMemo(
        () => buildTutorialStatisticRows(state.phase === 'loaded' ? state.response : undefined),
        [state],
    );
    const isPlatformScope = state.phase === 'loaded' && state.response.scope === 'PLATFORM';

    const columns = useMemo(() => {
        const tenantColumn: ColumnType<TutorialStatisticRow>[] = isPlatformScope
            ? [
                  {
                      title: t('statistic.tutorials.table.tenant'),
                      key: 'tenantId',
                      width: 90,
                      render: (unusedValue, row) => (row.tenantId === null ? '–' : `${row.tenantId}`),
                  },
              ]
            : [];

        const countColumn = (
            titleKey: string,
            field: 'notStarted' | 'inProgress' | 'completed' | 'skipped',
        ): ColumnType<TutorialStatisticRow> => ({
            title: t(titleKey),
            dataIndex: field,
            key: field,
            align: 'right',
            width: 130,
        });

        return [
            ...tenantColumn,
            {
                title: t('statistic.tutorials.table.tour'),
                key: 'tourId',
                render: (unusedValue, row) =>
                    t([`statistic.tutorials.tour.${row.tourId}`], { defaultValue: row.tourId }),
            },
            {
                title: t('statistic.tutorials.table.version'),
                dataIndex: 'tourVersion',
                key: 'tourVersion',
                width: 90,
            },
            {
                title: t('statistic.tutorials.table.surface'),
                key: 'surface',
                width: 120,
                render: (unusedValue, row) =>
                    t([`statistic.tutorials.surface.${row.surface}`], { defaultValue: row.surface }),
            },
            {
                title: t('statistic.tutorials.table.audiences'),
                key: 'audiences',
                width: 160,
                render: (unusedValue, row) =>
                    row.audiences.length
                        ? row.audiences
                              .map((audience) =>
                                  t([`statistic.tutorials.audience.${audience}`], { defaultValue: audience }),
                              )
                              .join(', ')
                        : '–',
            },
            countColumn('statistic.tutorials.table.notStarted', 'notStarted'),
            countColumn('statistic.tutorials.table.inProgress', 'inProgress'),
            countColumn('statistic.tutorials.table.completed', 'completed'),
            countColumn('statistic.tutorials.table.skipped', 'skipped'),
            {
                title: t('statistic.tutorials.table.completionRate'),
                key: 'completionPercent',
                align: 'right',
                width: 140,
                render: (unusedValue, row) => `${row.completionPercent}%`,
            },
        ] as ColumnType<TutorialStatisticRow>[];
    }, [isPlatformScope, t]);

    return (
        <section
            className="tutorialStatistics"
            aria-label={t('statistic.tutorials.title')}
            aria-busy={state.phase === 'loading'}
        >
            <h2 className="tutorialStatistics__title">{t('statistic.tutorials.title')}</h2>
            <p className="tutorialStatistics__subtitle">{t('statistic.tutorials.subtitle')}</p>
            {state.phase === 'loading' && (
                <p className="tutorialStatistics__notice">{t('statistic.tutorials.loading')}</p>
            )}
            {state.phase === 'forbidden' && <Alert type="info" showIcon message={t('statistic.tutorials.forbidden')} />}
            {state.phase === 'error' && (
                <Alert type="error" showIcon role="alert" message={t('statistic.tutorials.loadError')} />
            )}
            {state.phase === 'loaded' && rows.length === 0 && (
                <p className="tutorialStatistics__notice">{t('statistic.tutorials.empty')}</p>
            )}
            {state.phase === 'loaded' && rows.length > 0 && (
                <ListingTable<TutorialStatisticRow>
                    columns={columns}
                    dataSource={rows}
                    rowKey="key"
                    pagination={false}
                    scroll={{ x: 900 }}
                />
            )}
        </section>
    );
};
