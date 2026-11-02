import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import { AdminEmpty } from '../../../components/AdminEmpty';
import {
    DataTable,
    DataTableCell,
    DataTableHeader,
    DataTablePagination,
    DataTableRow,
    type DataTableColumn,
    type DataTableSort,
} from '../../../components/DataTable';
import { IconButton } from '../../../components/IconButton';
import { LoadMoreFooter } from '../../../components/UserTable/LoadMoreFooter';
import { RelativeTime } from '../../../components/UserTable/RelativeTime';
import { RowMenu, type RowMenuItem } from '../../../components/UserTable/RowMenu';
import { ScopeChip } from '../../../components/UserTable/ScopeChip';
import { ToneBadge } from '../../../components/UserTable/StatusBadge';
import { UserCard } from '../../../components/UserTable/UserCard';
import type { AgencyData } from '../../../types/agency';
import { useAgencyTableLayout } from './useAgencyTableLayout';
import styles from './agencyDataTable.module.scss';

export interface AgencyDataTableProps {
    rows: AgencyData[];
    loading: boolean;
    /** Shown instead of the rows when the list could not be loaded or is empty. */
    emptyText: string;
    sort: DataTableSort | null;
    onSortChange: (sort: DataTableSort | null) => void;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    /** Platform admins see every Träger's centres, so the Träger is shown. */
    showTenant: boolean;
    tenantNameOf: (row: AgencyData) => string | undefined;
    showTopics: boolean;
    /** With the topics feature on, a centre without topics says so instead of staying blank. */
    markMissingTopics: boolean;
    /** Omitted = no permission; the action is left out. */
    onEdit?: (row: AgencyData) => void;
    onDelete?: (row: AgencyData) => void;
    ariaLabel: string;
}

const isTeam = (row: AgencyData) => String(row.teamAgency) === 'true';
const inDeletion = (row: AgencyData) => row.status === 'IN_DELETION';
const streetLine = (row: AgencyData) => [row.street, row.houseNumber].filter(Boolean).join(' ');
const placeLine = (row: AgencyData) => [row.postcode, row.city].filter(Boolean).join(' ');
const topicNames = (row: AgencyData) => (row.topics ?? []).filter(Boolean).map((topic) => topic.name) as string[];
const lastChange = (row: AgencyData) => row.updateDate || row.createDate;

interface AgencyCardListProps {
    rows: AgencyData[];
    loading: boolean;
    emptyText: string;
    page: number;
    total: number;
    onLoadMore: () => void;
    renderBadge: (row: AgencyData) => ReactNode;
    renderDetails: (row: AgencyData) => ReactNode;
    onEdit?: (row: AgencyData) => void;
    onDelete?: (row: AgencyData) => void;
    ariaLabel: string;
}

type Pages = Record<number, AgencyData[]>;

/** Phone list: page 1 replaces, later pages append; a refetch replaces its own page (as for accounts). */
const AgencyCardList = ({
    rows,
    loading,
    emptyText,
    page,
    total,
    onLoadMore,
    renderBadge,
    renderDetails,
    onEdit,
    onDelete,
    ariaLabel,
}: AgencyCardListProps) => {
    const { t } = useTranslation();
    const [pages, setPages] = useState<Pages>({ [page]: rows });

    useEffect(() => {
        if (loading) return;
        setPages((current) => {
            if (current[page] === rows) return current;
            return page > 1 ? { ...current, [page]: rows } : { 1: rows };
        });
    }, [rows, page, loading]);

    const shown = useMemo(() => {
        const seen = new Set<string>();
        return Object.keys(pages)
            .map(Number)
            .sort((a, b) => a - b)
            .flatMap((number) => pages[number])
            .filter((row) => {
                const id = String(row.id);
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });
    }, [pages]);

    if (!loading && shown.length === 0) return <AdminEmpty description={emptyText} />;

    return (
        <section className={styles.cards} aria-label={ariaLabel} aria-busy={loading || undefined}>
            {/* First page still loading: say so instead of an empty area (the table shows skeleton rows). */}
            {loading && shown.length === 0 && (
                <div role="status" className={styles.cardsLoading}>
                    <CircularProgress size={20} color="inherit" aria-hidden />
                    {t('loading')}
                </div>
            )}
            {shown.map((row) => (
                <UserCard
                    key={row.id}
                    name={row.name}
                    // The e-mail is part of the contact in the details; not repeated under the name.
                    email=""
                    badge={renderBadge(row)}
                    actionsDisabled={inDeletion(row)}
                    onEdit={onEdit && (() => onEdit(row))}
                    onDelete={onDelete && (() => onDelete(row))}
                >
                    {renderDetails(row)}
                </UserCard>
            ))}
            {shown.length > 0 && (
                <LoadMoreFooter shown={shown.length} total={total} loading={loading} onLoadMore={onLoadMore} />
            )}
        </section>
    );
};

/**
 * Beratungsstellen list in the accounts-table design (Admin#1184): one two-line row per centre,
 * contact and every topic in the expanded row, cards below the measured phone band.
 */
export const AgencyDataTable = ({
    rows,
    loading,
    emptyText,
    sort,
    onSortChange,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    showTenant,
    tenantNameOf,
    showTopics,
    markMissingTopics,
    onEdit,
    onDelete,
    ariaLabel,
}: AgencyDataTableProps) => {
    const { t } = useTranslation();
    const tableId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const layout = useAgencyTableLayout(containerRef, { tenant: showTenant, topics: showTopics });
    const [openRows, setOpenRows] = useState<string[]>([]);
    const tablet = layout === 'tablet';

    const detailsId = (row: AgencyData) => `${tableId}-details-${row.id}`;
    const toggleRow = (id: string) =>
        setOpenRows((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));

    // A new page or search shows other centres; their expansion state starts closed.
    const rowIds = rows.map((row) => row.id).join(',');
    useEffect(() => setOpenRows([]), [rowIds]);

    const columns: DataTableColumn[] = [
        { key: 'name', label: t('agency.name'), sortable: true },
        ...(tablet ? [] : [{ key: 'id', label: t('agency.list.id'), sortable: true, width: 88 }]),
        { key: 'address', label: t('agency.list.address', 'Adresse'), sortable: true },
        ...(showTenant ? [{ key: 'tenant', label: t('tenantName') }] : []),
        ...(showTopics ? [{ key: 'topics', label: t('topics.title') }] : []),
        { key: 'status', label: t('status'), sortable: true, width: 156 },
        ...(tablet ? [] : [{ key: 'lastChange', label: t('users.table.lastUpdated'), width: 168 }]),
        {
            key: 'actions',
            label: '',
            ariaLabel: t('userTable.columns.actions', 'Aktionen'),
            align: 'right',
            width: tablet ? 64 : 140,
        },
    ];

    const statusBadge = (row: AgencyData) => {
        if (inDeletion(row)) {
            return (
                <ToneBadge tone="ended" Icon={CloseIcon}>
                    {t('userTable.status.IN_DELETION', 'Wird gelöscht')}
                </ToneBadge>
            );
        }
        return row.offline ? (
            <ToneBadge tone="pending" Icon={VisibilityOffOutlinedIcon}>
                {t('agency.status.offline')}
            </ToneBadge>
        ) : (
            <ToneBadge tone="active" Icon={VisibilityOutlinedIcon}>
                {t('agency.status.online')}
            </ToneBadge>
        );
    };

    const teamBadge = (row: AgencyData) =>
        isTeam(row) ? (
            <ToneBadge tone="ended" Icon={GroupsOutlinedIcon}>
                {t('agency.teamAgency')}
            </ToneBadge>
        ) : null;

    const topicsCell = (row: AgencyData) => {
        const names = topicNames(row);
        if (names.length === 0) {
            return markMissingTopics ? <span className={styles.muted}>{t('agency.noTopics')}</span> : null;
        }
        return (
            <span className={styles.topics}>
                <span className={styles.topic} title={names[0]}>
                    {names[0]}
                </span>
                {names.length > 1 && <span className={styles.more}>+{names.length - 1}</span>}
            </span>
        );
    };

    const tenantChip = (row: AgencyData) =>
        row.tenantId != null ? (
            <ScopeChip kind="tenant" id={String(row.tenantId)} name={tenantNameOf(row) ?? ''} />
        ) : null;

    /** Everything that does not fit the row: shown in the expansion row and in the phone card. */
    const details = (row: AgencyData, { withSummary }: { withSummary: boolean }) => {
        const contact = [row.phone, row.email].filter(Boolean);
        const names = topicNames(row);
        const facts: [string, ReactNode][] = [
            ...(withSummary
                ? ([
                      [t('agency.list.id'), row.id],
                      [
                          t('agency.list.address', 'Adresse'),
                          [streetLine(row), placeLine(row)].filter(Boolean).join(', ') || null,
                      ],
                      [t('tenantName'), showTenant ? tenantChip(row) : null],
                      [t('agency.teamAgency'), isTeam(row) ? t('yes') : null],
                  ] as [string, ReactNode][])
                : []),
            [
                t('agency.list.contact', 'Kontakt'),
                contact.length ? (
                    <span className={styles.lines}>
                        {row.phone && <a href={`tel:${row.phone}`}>{row.phone}</a>}
                        {row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}
                    </span>
                ) : null,
            ],
            [t('topics.title'), showTopics && names.length ? names.join(', ') : null],
            [t('agency.description'), row.description?.trim() || null],
            [
                t('users.table.lastUpdated'),
                withSummary && lastChange(row) ? <RelativeTime value={lastChange(row) as string} /> : null,
            ],
        ];
        const shown = facts.filter(([, value]) => value != null && value !== '');
        return (
            <dl className={styles.facts} id={withSummary ? undefined : detailsId(row)}>
                {shown.length ? (
                    shown.map(([label, value]) => (
                        <div key={label} className={styles.fact}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))
                ) : (
                    <div className={styles.fact}>
                        <dd className={styles.muted}>{t('agency.list.noDetails', 'Keine weiteren Angaben')}</dd>
                    </div>
                )}
            </dl>
        );
    };

    const renderCell = (key: string, row: AgencyData) => {
        const { name } = row;
        switch (key) {
            case 'name':
                return (
                    <span className={styles.nameCell}>
                        <span className={styles.name}>{name}</span>
                        {tablet && <span className={styles.secondary}>ID {row.id}</span>}
                        {teamBadge(row)}
                    </span>
                );
            case 'id':
                return <span className={styles.secondary}>{row.id}</span>;
            case 'address':
                return (
                    <span className={classNames(styles.lines, styles.address)}>
                        {streetLine(row) && <span>{streetLine(row)}</span>}
                        <span className={streetLine(row) ? styles.secondary : undefined}>{placeLine(row) || '—'}</span>
                    </span>
                );
            case 'tenant':
                return tenantChip(row);
            case 'topics':
                return topicsCell(row);
            case 'status':
                return statusBadge(row);
            case 'lastChange':
                return lastChange(row) ? <RelativeTime value={lastChange(row) as string} /> : '—';
            case 'actions': {
                const isOpen = openRows.includes(String(row.id));
                const pending = inDeletion(row);
                const showLabel = isOpen
                    ? t('agency.list.details.hide', 'Details zu {{name}} ausblenden', { name })
                    : t('agency.list.details.show', 'Details zu {{name}} anzeigen', { name });
                if (tablet) {
                    const items: RowMenuItem[] = [
                        {
                            key: 'details',
                            label: showLabel,
                            icon: isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />,
                            onSelect: () => toggleRow(String(row.id)),
                        },
                        ...(onEdit
                            ? [
                                  {
                                      key: 'edit',
                                      label: t('edit'),
                                      icon: <EditOutlinedIcon />,
                                      disabled: pending,
                                      onSelect: () => onEdit(row),
                                  },
                              ]
                            : []),
                        ...(onDelete
                            ? [
                                  {
                                      key: 'delete',
                                      label: t('delete'),
                                      icon: <DeleteOutlinedIcon />,
                                      tone: 'error' as const,
                                      disabled: pending,
                                      onSelect: () => onDelete(row),
                                  },
                              ]
                            : []),
                    ];
                    return (
                        <RowMenu
                            items={items}
                            ariaLabel={t('userTable.rowMenu.label', 'Weitere Aktionen für {{name}}', { name })}
                        />
                    );
                }
                return (
                    <span className={styles.actions}>
                        <IconButton
                            icon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            ariaLabel={showLabel}
                            ariaExpanded={isOpen}
                            ariaControls={detailsId(row)}
                            onClick={() => toggleRow(String(row.id))}
                        />
                        {onEdit && (
                            <IconButton
                                icon={<EditOutlinedIcon />}
                                ariaLabel={t('userTable.card.edit', '{{name}} bearbeiten', { name })}
                                disabled={pending}
                                onClick={() => onEdit(row)}
                            />
                        )}
                        {onDelete && (
                            <IconButton
                                icon={<DeleteOutlinedIcon />}
                                ariaLabel={t('userTable.card.delete', '{{name}} löschen', { name })}
                                disabled={pending}
                                onClick={() => onDelete(row)}
                            />
                        )}
                    </span>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div ref={containerRef} className={styles.responsiveContainer} data-testid="agency-list">
            {layout === 'phone' ? (
                <AgencyCardList
                    rows={rows}
                    loading={loading}
                    emptyText={emptyText}
                    page={page}
                    total={total}
                    onLoadMore={() => onPageChange(page + 1)}
                    renderBadge={(row) => (
                        <span className={styles.badges}>
                            {statusBadge(row)}
                            {teamBadge(row)}
                        </span>
                    )}
                    renderDetails={(row) => details(row, { withSummary: true })}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    ariaLabel={ariaLabel}
                />
            ) : (
                <DataTable
                    ariaLabel={ariaLabel}
                    className={classNames(styles.table, { [styles.tablet]: tablet })}
                    header={<DataTableHeader columns={columns} sort={sort} onSortChange={onSortChange} sortRequired />}
                    loading={loading}
                    skeletonColumns={columns.length}
                    isEmpty={rows.length === 0}
                    empty={<AdminEmpty description={emptyText} />}
                    footer={
                        <DataTablePagination
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={onPageChange}
                            onPageSizeChange={onPageSizeChange}
                        />
                    }
                >
                    {rows.map((row) => (
                        <DataTableRow
                            key={row.id}
                            tone={inDeletion(row) ? 'error' : 'default'}
                            expanded={openRows.includes(String(row.id))}
                            expandedContent={details(row, { withSummary: false })}
                            expansionColSpan={columns.length}
                        >
                            {columns.map((column) => (
                                <DataTableCell key={column.key} align={column.align}>
                                    {renderCell(column.key, row)}
                                </DataTableCell>
                            ))}
                        </DataTableRow>
                    ))}
                </DataTable>
            )}
        </div>
    );
};
