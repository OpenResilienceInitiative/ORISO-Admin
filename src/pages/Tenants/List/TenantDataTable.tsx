import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import { entityStatusListAttributes, statusLabel } from '../../../components/EntityStatusCard/presentation';
import { IconButton } from '../../../components/IconButton';
import { LoadMoreFooter } from '../../../components/UserTable/LoadMoreFooter';
import { RelativeTime } from '../../../components/UserTable/RelativeTime';
import { RowMenu, type RowMenuItem } from '../../../components/UserTable/RowMenu';
import { UserCard } from '../../../components/UserTable/UserCard';
import { useMeasuredListLayout } from '../../../hooks/useMeasuredListLayout';
import type { BasicTenantData } from '../../../types/tenant';
import decodeHTML from '../../../utils/decodeHTML';
import { getDomain } from '../../../utils/getDomain';
import styles from './tenantDataTable.module.scss';

/** TenantService search rows carry the Träger admins' e-mails (AdminTenantDTO.adminEmails). */
export type TenantRow = BasicTenantData & { adminEmails?: string[] | null };

export interface TenantDataTableProps {
    rows: TenantRow[];
    loading: boolean;
    emptyText: string;
    sort: DataTableSort | null;
    onSortChange: (sort: DataTableSort | null) => void;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    /** Hidden with single-domain multitenancy, where every Träger shares one domain. */
    showSubdomain: boolean;
    /** Omitted = no permission; the action is left out. */
    onEdit?: (row: TenantRow) => void;
    onDelete?: (row: TenantRow) => void;
    /** The main Träger of a single-domain installation cannot be deleted. */
    canDeleteRow: (row: TenantRow) => boolean;
    ariaLabel: string;
}

// Measured in Storybook "Pages/Tenants/TenantList" (2026-11-10) on the list container, with long
// names and e-mails: the wide row (name, status, ID, e-mail, both dates, actions) needs 862px; subdomain
// and the maximum of counsellors are in the details. The tablet row fits down to 400px; below 600px
// cards read better (same band as the accounts list).
const PHONE_BELOW = 600;
/**
 * The subdomain is hidden in the list (expanded row and phone card): subdomains are not technically
 * finished. Set to `true` to show it again, in the details, for installations with their own domains.
 */
const SHOW_SUBDOMAIN_IN_LIST = false;
const WIDE_FROM = 875;

const adminsOf = (row: TenantRow) => (row.adminEmails ?? []).filter(Boolean);
const nameOf = (row: TenantRow) => decodeHTML(row.name);

const formatDate = (value: string | undefined, locale: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? null
        : date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
};

interface TenantCardListProps {
    rows: TenantRow[];
    loading: boolean;
    emptyText: string;
    page: number;
    total: number;
    onLoadMore: () => void;
    renderDetails: (row: TenantRow) => ReactNode;
    onEdit?: (row: TenantRow) => void;
    onDelete?: (row: TenantRow) => void;
    canDeleteRow: (row: TenantRow) => boolean;
    ariaLabel: string;
}

type Pages = Record<number, TenantRow[]>;

/** Phone list: page 1 replaces, later pages append; a refetch replaces its own page (as for accounts). */
const TenantCardList = ({
    rows,
    loading,
    emptyText,
    page,
    total,
    onLoadMore,
    renderDetails,
    onEdit,
    onDelete,
    canDeleteRow,
    ariaLabel,
}: TenantCardListProps) => {
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
        const seen = new Set<number | null>();
        return Object.keys(pages)
            .map(Number)
            .sort((a, b) => a - b)
            .flatMap((number) => pages[number])
            .filter((row) => {
                if (seen.has(row.id)) return false;
                seen.add(row.id);
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
                    name={nameOf(row)}
                    // The admins' e-mails are listed in the details, not repeated under the name.
                    email=""
                    onEdit={onEdit && (() => onEdit(row))}
                    onDelete={onDelete && canDeleteRow(row) ? () => onDelete(row) : undefined}
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
 * Träger list in the accounts-table design (Admin#1184): admins' e-mails and created/changed
 * dates per row, every admin in the expanded row, cards below the measured phone band.
 */
export const TenantDataTable = ({
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
    showSubdomain,
    onEdit,
    onDelete,
    canDeleteRow,
    ariaLabel,
}: TenantDataTableProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language?.startsWith('de') ? 'de-DE' : 'en-GB';
    const tableId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const layout = useMeasuredListLayout(containerRef, {
        phoneBelow: PHONE_BELOW,
        wideFrom: WIDE_FROM,
    });
    const tablet = layout === 'tablet';
    const [openRows, setOpenRows] = useState<number[]>([]);

    const detailsId = (row: TenantRow) => `${tableId}-details-${row.id}`;
    const toggleRow = (id: number) =>
        setOpenRows((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));

    // A new page or search shows other Träger; their expansion state starts closed.
    const rowIds = rows.map((row) => row.id).join(',');
    useEffect(() => setOpenRows([]), [rowIds]);

    // The maximum of allowed counsellors lives in the details (expanded row, phone card); the subdomain
    // would too, but is hidden for now (SHOW_SUBDOMAIN_IN_LIST).
    const columns: DataTableColumn[] = [
        { key: 'name', label: t('tenants.list.name'), sortable: true, width: tablet ? undefined : '28%' },
        { key: 'status', label: t('entityStatus.title'), width: 110 },
        ...(tablet ? [] : [{ key: 'id', label: t('tenants.list.tenantIdShort'), sortable: true, width: 72 }]),
        { key: 'admins', label: t('tenants.list.adminEmails') },
        ...(tablet ? [] : [{ key: 'created', label: t('tenants.list.created', 'Angelegt'), width: 120 }]),
        ...(tablet ? [] : [{ key: 'lastChange', label: t('users.table.lastUpdated'), width: 160 }]),
        {
            key: 'actions',
            label: '',
            ariaLabel: t('userTable.columns.actions', 'Aktionen'),
            align: 'right',
            width: tablet ? 64 : 140,
        },
    ];

    const subdomainLink = (row: TenantRow) =>
        row.subdomain ? (
            <Link target="_blank" to={`//${getDomain(row.subdomain)}`} className={styles.subdomain}>
                {getDomain(row.subdomain)}
            </Link>
        ) : null;

    const statusCell = (row: TenantRow) => (
        <span {...entityStatusListAttributes('tenant', row.id, row.active)}>{t(statusLabel(row.active))}</span>
    );

    const details = (row: TenantRow, { withSummary }: { withSummary: boolean }) => {
        const admins = adminsOf(row);
        const facts: [string, ReactNode][] = [
            ...(withSummary
                ? ([
                      [t('entityStatus.title'), statusCell(row)],
                      [t('tenants.list.tenantId'), row.id],
                  ] as [string, ReactNode][])
                : []),
            [t('tenants.list.subdomain'), SHOW_SUBDOMAIN_IN_LIST && showSubdomain ? subdomainLink(row) : null],
            [t('tenants.list.maxConsultants'), row.licensing?.allowedNumberOfUsers ?? null],
            [
                t('tenants.list.adminEmails'),
                admins.length ? (
                    <span className={styles.lines}>
                        {admins.map((email) => (
                            <a key={email} href={`mailto:${email}`}>
                                {email}
                            </a>
                        ))}
                    </span>
                ) : null,
            ],
            [t('tenants.list.created', 'Angelegt'), formatDate(row.createDate, locale)],
            [t('users.table.lastUpdated'), row.updateDate ? <RelativeTime value={row.updateDate} /> : null],
        ];
        const shown = facts.filter(([, value]) => value != null && value !== '');
        return (
            <dl className={styles.facts} id={withSummary ? undefined : detailsId(row)}>
                {shown.map(([label, value]) => (
                    <div key={label} className={styles.fact}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        );
    };

    const renderCell = (key: string, row: TenantRow) => {
        const name = nameOf(row);
        switch (key) {
            case 'name':
                return (
                    <span className={styles.nameCell}>
                        <span className={styles.name}>{name}</span>
                        {tablet && <span className={styles.secondary}>ID {row.id}</span>}
                    </span>
                );
            case 'status':
                return statusCell(row);
            case 'id':
                return <span className={styles.secondary}>{row.id}</span>;
            case 'admins': {
                const [first, ...more] = adminsOf(row);
                if (!first) return <span className={styles.secondary}>{t('tenants.list.noAdmins', 'Kein Admin')}</span>;
                return (
                    <span className={styles.admins}>
                        <span className={styles.email} title={first}>
                            {first}
                        </span>
                        {more.length > 0 && <span className={styles.more}>+{more.length}</span>}
                    </span>
                );
            }
            case 'created':
                return formatDate(row.createDate, locale) ?? '—';
            case 'lastChange':
                return row.updateDate ? <RelativeTime value={row.updateDate} /> : '—';
            case 'actions': {
                const isOpen = openRows.includes(row.id as number);
                const deletable = canDeleteRow(row);
                const showLabel = isOpen
                    ? t('tenants.list.details.hide', 'Details zu {{name}} ausblenden', { name })
                    : t('tenants.list.details.show', 'Details zu {{name}} anzeigen', { name });
                if (tablet) {
                    const items: RowMenuItem[] = [
                        {
                            key: 'details',
                            label: showLabel,
                            icon: isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />,
                            onSelect: () => toggleRow(row.id as number),
                        },
                        ...(onEdit
                            ? [
                                  {
                                      key: 'edit',
                                      label: t('edit'),
                                      icon: <EditOutlinedIcon />,
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
                                      disabled: !deletable,
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
                            onClick={() => toggleRow(row.id as number)}
                        />
                        {onEdit && (
                            <IconButton
                                icon={<EditOutlinedIcon />}
                                ariaLabel={t('userTable.card.edit', '{{name}} bearbeiten', { name })}
                                onClick={() => onEdit(row)}
                            />
                        )}
                        {onDelete && (
                            <IconButton
                                icon={<DeleteOutlinedIcon />}
                                ariaLabel={t('userTable.card.delete', '{{name}} löschen', { name })}
                                disabled={!deletable}
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
        <div ref={containerRef} className={styles.responsiveContainer} data-testid="tenant-list">
            {layout === 'phone' ? (
                <TenantCardList
                    rows={rows}
                    loading={loading}
                    emptyText={emptyText}
                    page={page}
                    total={total}
                    onLoadMore={() => onPageChange(page + 1)}
                    renderDetails={(row) => details(row, { withSummary: true })}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canDeleteRow={canDeleteRow}
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
                            expanded={openRows.includes(row.id as number)}
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
