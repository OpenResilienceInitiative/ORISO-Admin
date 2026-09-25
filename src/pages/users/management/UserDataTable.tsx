import { Fragment, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';
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
import { PersonCell } from '../../../components/UserTable/PersonCell';
import { RowMenu, type RowMenuItem } from '../../../components/UserTable/RowMenu';
import { RelativeTime } from '../../../components/UserTable/RelativeTime';
import { ScopeChip } from '../../../components/UserTable/ScopeChip';
import { SortPill, type NameSortField } from '../../../components/UserTable/SortPill';
import { StatusBadge } from '../../../components/UserTable/StatusBadge';
import { PermissionAction } from '../../../enums/PermissionAction';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import type { CounselorData } from '../../../types/counselor';
import { resolveDisplayStatus } from '../../../types/userDisplayStatus';
import { getDomain } from '../../../utils/getDomain';
import { getLastUpdatedAt } from './formatLastUpdated';
import { CentreList } from './CentreList';
import { UserCardList } from './UserCardList';
import { useUserTableLayout } from './useUserTableLayout';
import { getVisibleColumns, USER_TABLE_CONFIGS } from './userTableConfigs';
import {
    DATE_SORT_FIELD,
    displayName,
    hasOtherIdentityFor,
    NAME_SORT_FIELD,
    nameFieldOf,
    sortColumnOf,
} from './userRows';
import styles from './userDataTable.module.scss';

export interface UserDataTableProps {
    sectionId: TypeOfUser;
    rows: CounselorData[];
    loading: boolean;
    showTenant: boolean;
    showSubdomain: boolean;
    canEditOrDelete: boolean;
    /** Server order as sent by the API, e.g. `UPDATE_DATE` / `DESC`. */
    sortBy: string;
    order: string;
    onSortChange: (sortBy: string, order: 'ASC' | 'DESC') => void;
    onEdit: (row: CounselorData) => void;
    onDelete: (row: CounselorData) => void;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    ariaLabel?: string;
}

/**
 * Users-hub table: one two-line row per person, arrows only where the server can sort.
 * Below 1440 Träger and Stellen share a column, below 1024 actions move into ⋯, below 768 cards.
 */
export const UserDataTable = ({
    sectionId,
    rows,
    loading,
    showTenant,
    showSubdomain,
    canEditOrDelete,
    sortBy,
    order,
    onSortChange,
    onEdit,
    onDelete,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    ariaLabel,
}: UserDataTableProps) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const [openRows, setOpenRows] = useState<string[]>([]);
    const [pickedNameField, setPickedNameField] = useState<NameSortField>('lastname');

    const layout = useUserTableLayout();
    const narrow = layout === 'compact' || layout === 'tablet';

    const config = USER_TABLE_CONFIGS[sectionId];
    const configColumns = getVisibleColumns(sectionId, { showTenant, showSubdomain });
    const configColumn = (key: string) => configColumns.find((column) => column.key === key);
    const has = (key: string) => configColumn(key) != null;
    const canEdit = canEditOrDelete && can(PermissionAction.Update, config.updateResource);
    const canDelete = canEditOrDelete && can(PermissionAction.Delete, config.updateResource);
    const canExpand = (row: CounselorData) => config.showAgencyExpand && (row.agencies?.length ?? 0) > 1;

    const activeColumn = sortColumnOf(sortBy);
    const nameField = nameFieldOf(sortBy) ?? pickedNameField;
    const sort: DataTableSort | null = activeColumn
        ? { key: activeColumn, direction: order === 'DESC' ? 'desc' : 'asc' }
        : null;

    const handleSort = (next: DataTableSort | null) => {
        if (!next) return;
        const direction = next.direction === 'desc' ? 'DESC' : 'ASC';
        onSortChange(next.key === 'name' ? NAME_SORT_FIELD[nameField] : DATE_SORT_FIELD, direction);
    };

    const pickNameField = (field: NameSortField) => {
        setPickedNameField(field);
        onSortChange(NAME_SORT_FIELD[field], activeColumn === 'name' && order === 'DESC' ? 'DESC' : 'ASC');
    };

    const identityLabel = t(
        sectionId === TypeOfUser.Consultants ? 'users.table.alsoTenantAdmin' : 'users.table.alsoConsultant',
    );

    const contextLabels: Record<string, string> = {
        tenant: t('tenantName'),
        subdomain: t('tenantAdmins.form.subdomain'),
        agency: t('agency'),
    };
    const contextKeys = Object.keys(contextLabels).filter(has);
    const contextColumns: DataTableColumn[] = narrow
        ? contextKeys.length > 0
            ? [{ key: 'context', label: contextKeys.map((key) => contextLabels[key]).join(' · ') }]
            : []
        : contextKeys.map((key) => ({ key, label: contextLabels[key] }));

    const actionsWidth = { wide: 140, compact: config.showAgencyExpand ? 136 : 104, tablet: 64, phone: 0 }[layout];

    const columns: DataTableColumn[] = [
        {
            key: 'name',
            label: t('userTable.columns.name', 'Name'),
            sortable: !!configColumn('lastname')?.sortable,
            addon: configColumn('lastname')?.sortable && (
                <span className={styles.pill}>
                    <SortPill value={nameField} onChange={pickNameField} compact={narrow} />
                </span>
            ),
        },
        ...contextColumns,
        ...(has('status') && config.showStatus
            ? [{ key: 'status', label: t('status'), width: narrow ? 120 : 150 }]
            : []),
        ...(has('lastUpdated') && layout !== 'tablet'
            ? [
                  {
                      key: 'lastUpdated',
                      label: t('users.table.lastUpdated'),
                      sortable: !!configColumn('lastUpdated')?.sortable,
                      firstDirection: 'desc' as const,
                      width: narrow ? 132 : 190,
                  },
              ]
            : []),
        ...(has('hasOtherIdentity') && !narrow ? [{ key: 'hasOtherIdentity', label: identityLabel, width: 150 }] : []),
        {
            key: 'actions',
            label: '',
            ariaLabel: t('userTable.columns.actions', 'Aktionen'),
            align: 'right',
            width: actionsWidth,
        },
    ];

    const toggleRow = (id: string) =>
        setOpenRows((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));

    const renderCell = (key: string, row: CounselorData) => {
        const name = displayName(row);
        switch (key) {
            case 'name':
                return <PersonCell name={name} email={row.email} />;
            case 'tenant':
                return row.tenantId ? <ScopeChip kind="tenant" id={row.tenantId} name={row.tenantName} /> : null;
            case 'subdomain':
                return row.tenantSubdomain ? (
                    <Link target="_blank" to={`//${getDomain(row.tenantSubdomain)}`}>
                        {getDomain(row.tenantSubdomain)}
                    </Link>
                ) : null;
            case 'agency': {
                const [first] = row.agencies ?? [];
                if (!first) return null;
                return (
                    <span className={styles.firstCentre}>
                        <ScopeChip
                            kind="agency"
                            id={first.id ?? ''}
                            name={first.name ?? ''}
                            postcode={first.postcode}
                            city={first.city}
                        />
                        {row.agencies.length > 1 && <span className={styles.more}>+{row.agencies.length - 1}</span>}
                    </span>
                );
            }
            case 'status':
                return <StatusBadge status={resolveDisplayStatus(row)} />;
            case 'lastUpdated': {
                const date = getLastUpdatedAt(row);
                return date ? <RelativeTime value={date.toISOString()} /> : '—';
            }
            case 'hasOtherIdentity':
                return hasOtherIdentityFor(sectionId, row) ? (
                    <span role="img" aria-label={identityLabel} data-testid="other-identity-checkmark">
                        <CheckIcon className={styles.check} aria-hidden />
                    </span>
                ) : null;
            case 'context':
                return (
                    <span className={styles.context}>
                        {contextKeys.map((contextKey) => (
                            <Fragment key={contextKey}>{renderCell(contextKey, row)}</Fragment>
                        ))}
                    </span>
                );
            case 'actions': {
                const isOpen = openRows.includes(row.id);
                const pending = row.status === 'IN_DELETION';
                if (layout === 'tablet') {
                    const items: RowMenuItem[] = [
                        ...(canExpand(row)
                            ? [
                                  {
                                      key: 'centres',
                                      label: isOpen
                                          ? t('userTable.rowMenu.hideCentres', 'Beratungsstellen ausblenden')
                                          : t('userTable.rowMenu.showCentres', 'Beratungsstellen zeigen'),
                                      icon: isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />,
                                      onSelect: () => toggleRow(row.id),
                                  },
                              ]
                            : []),
                        ...(canEdit
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
                        ...(canDelete
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
                    return items.length > 0 ? (
                        <RowMenu
                            items={items}
                            ariaLabel={t('userTable.rowMenu.label', 'Weitere Aktionen für {{name}}', { name })}
                        />
                    ) : null;
                }
                return (
                    <span className={styles.actions}>
                        {canExpand(row) && (
                            <IconButton
                                icon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                ariaLabel={t('userTable.centres.of', 'Beratungsstellen von {{name}}', { name })}
                                ariaExpanded={isOpen}
                                onClick={() => toggleRow(row.id)}
                            />
                        )}
                        {canEdit && (
                            <IconButton
                                icon={<EditOutlinedIcon />}
                                ariaLabel={t('userTable.card.edit', '{{name}} bearbeiten', { name })}
                                disabled={pending}
                                onClick={() => onEdit(row)}
                            />
                        )}
                        {canDelete && (
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

    const cardFacts = (row: CounselorData) => {
        const facts: [string, ReactNode][] = [
            [t('tenantName'), has('tenant') ? renderCell('tenant', row) : null],
            [t('tenantAdmins.form.subdomain'), has('subdomain') ? renderCell('subdomain', row) : null],
            [t('agency'), has('agency') && row.agencies?.length ? <CentreList row={row} /> : null],
            [t('users.table.lastUpdated'), has('lastUpdated') ? renderCell('lastUpdated', row) : null],
            [identityLabel, has('hasOtherIdentity') && hasOtherIdentityFor(sectionId, row) ? t('yes') : null],
        ];
        return (
            <dl className={styles.facts}>
                {facts
                    .filter(([, value]) => value != null)
                    .map(([label, value]) => (
                        <div key={label} className={styles.fact}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
            </dl>
        );
    };

    if (layout === 'phone') {
        return (
            <UserCardList
                rows={rows}
                loading={loading}
                page={page}
                total={total}
                onLoadMore={() => onPageChange(page + 1)}
                onEdit={canEdit ? onEdit : undefined}
                onDelete={canDelete ? onDelete : undefined}
                details={cardFacts}
                ariaLabel={ariaLabel}
            />
        );
    }

    return (
        <DataTable
            ariaLabel={ariaLabel}
            className={classNames(styles.table, { [styles.narrow]: narrow })}
            header={<DataTableHeader columns={columns} sort={sort} onSortChange={handleSort} sortRequired />}
            loading={loading}
            skeletonColumns={columns.length}
            isEmpty={rows.length === 0}
            empty={<AdminEmpty />}
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
                    expanded={openRows.includes(row.id)}
                    expandedContent={<CentreList row={row} />}
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
    );
};
