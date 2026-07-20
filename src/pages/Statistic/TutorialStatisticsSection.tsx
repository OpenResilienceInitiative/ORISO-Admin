import { Alert, Table } from 'antd';
import type { ColumnType } from 'antd/lib/table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';
import { buildTutorialStatisticRows, TutorialStatisticRow } from './tutorialStatisticsData';
import { useTutorialStatistics } from './useTutorialStatistics.hook';

export interface TutorialStatisticsSectionProps {
    /** Injectable for tests/Storybook; defaults to the real admin statistics API. */
    loadStatistics?: () => Promise<TutorialStatisticsResponse>;
}

/**
 * Aggregate tutorial-completion dashboard section (epic TOUR-07). Backend scoping is
 * authoritative: tenant admins receive only their tenant, platform admins global
 * counts per tenant. A 403 renders as an in-place "no access" notice and API
 * failures as a real error state — never as an empty-success table. No per-user
 * tutorial history exists in the API contract or in this view.
 */
export const TutorialStatisticsSection = ({ loadStatistics }: TutorialStatisticsSectionProps) => {
    const { t } = useTranslation();
    const { response, isLoading, isForbidden, isError } = useTutorialStatistics(loadStatistics);

    const rows = useMemo(() => buildTutorialStatisticRows(response), [response]);
    const isLoaded = !isLoading && !isForbidden && !isError;
    const isPlatformScope = response?.scope === 'PLATFORM';

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
        <section className="tutorialStatistics" aria-label={t('statistic.tutorials.title')} aria-busy={isLoading}>
            <h2 className="tutorialStatistics__title">{t('statistic.tutorials.title')}</h2>
            <p className="tutorialStatistics__subtitle">{t('statistic.tutorials.subtitle')}</p>
            {isLoading && <p className="tutorialStatistics__notice">{t('statistic.tutorials.loading')}</p>}
            {isForbidden && <Alert type="info" showIcon message={t('statistic.tutorials.forbidden')} />}
            {isError && <Alert type="error" showIcon role="alert" message={t('statistic.tutorials.loadError')} />}
            {isLoaded && rows.length === 0 && (
                <p className="tutorialStatistics__notice">{t('statistic.tutorials.empty')}</p>
            )}
            {isLoaded && rows.length > 0 && (
                <>
                    {/* Focusable scroll region: keyboard users must be able to reach and
                        scroll a wide table (axe: scrollable-region-focusable). */}
                    {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
                    <div
                        className="tutorialStatistics__tableWrap"
                        role="region"
                        aria-label={t('statistic.tutorials.title')}
                        tabIndex={0}
                    >
                        {/* Deliberately not ListingTable: its viewport-height scroll
                            container is unreachable by keyboard; the wrapper above is
                            the single scrollable region of this embedded section. */}
                        <Table<TutorialStatisticRow>
                            columns={columns}
                            dataSource={rows}
                            rowKey="key"
                            pagination={false}
                        />
                    </div>
                    {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
                </>
            )}
        </section>
    );
};
