import { Button, Table, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdviceSeekerData } from '../../../api/adviceSeeker/adviceSeekers';
import { useAdviceSeekersData } from '../../../hooks/useAdviceSeekersData';
import { ListSearchBar } from '../../../components/ListSearchBar';
import { ToneBadge, type BadgeTone } from '../../../components/UserTable/StatusBadge';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useListQuery } from '../../../hooks/useListQuery';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import type { UserSearchFilters } from '../../../utils/userSearchFilters';
import { UserScopeFilters, useScopeFilterAvailability } from '../management/UserScopeFilters';
import { adviceSeekerStatus, canMarkForDeletion, type AdviceSeekerStatus } from './adviceSeekerStatus';
import { DeleteAdviceSeekersModal } from './DeleteAdviceSeekersModal';
import styles from './adviceSeekers.module.scss';

// Agencies and Träger are small lists; one page is the whole set.
const ALL = 10000;
const DEFAULT_PAGE_SIZE = 20;

const STATUS_BADGE: Record<AdviceSeekerStatus, { tone: BadgeTone; Icon: typeof CheckIcon }> = {
    active: { tone: 'active', Icon: CheckIcon },
    inDeletion: { tone: 'ended', Icon: CloseIcon },
    deletionFailed: { tone: 'ended', Icon: ErrorOutlineIcon },
    reactivating: { tone: 'pending', Icon: HourglassEmptyOutlinedIcon },
};

const formatDate = (value?: string) => (value ? new Date(`${value}Z`).toLocaleDateString() : '–');

/**
 * Advice seekers of the admin's reach: find them by username, centre or Träger and delete one or
 * many (ORISO-Admin#1521). Deleting marks them; the nightly job removes them everywhere.
 */
export const AdviceSeekersTable = () => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const available = useScopeFilterAvailability(TypeOfUser.AdviceSeekers);
    const canDelete = can(PermissionAction.Delete, Resource.AdviceSeeker);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
    // The username comes from the admin search (⌘K) as `?q=`; lists have no search field of their own.
    const { query: username, clear: clearSearch } = useListQuery();
    const [filters, setFilters] = useState<UserSearchFilters>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [toDelete, setToDelete] = useState<AdviceSeekerData[] | null>(null);

    const query = useAdviceSeekersData({ page, perPage, username, filters });
    const rows = useMemo(() => query.data?.data ?? [], [query.data]);

    const agencies = useAgenciesData({ pageSize: ALL, enabled: available.canListAgencies });
    const tenants = useTenantsData({ perPage: ALL, enabled: isSuperAdmin });
    const agencyName = useMemo(() => {
        const names = new Map((agencies.data?.data ?? []).map((agency) => [String(agency.id), agency.name]));
        return (id: number) => names.get(String(id)) ?? String(id);
    }, [agencies.data]);
    const tenantName = useMemo(() => {
        const names = new Map((tenants.data?.data ?? []).map((tenant) => [String(tenant.id), tenant.name]));
        return (id?: number) => (id == null ? '–' : names.get(String(id)) ?? String(id));
    }, [tenants.data]);

    // A new search from ⌘K starts on the first page with nothing selected.
    const [searchedFor, setSearchedFor] = useState(username);
    if (searchedFor !== username) {
        setSearchedFor(username);
        setPage(1);
        setSelectedIds([]);
    }

    const resetToFirstPage = () => {
        setPage(1);
        setSelectedIds([]);
    };

    const columns: ColumnsType<AdviceSeekerData> = [
        { key: 'username', title: t('adviceSeekers.column.username'), dataIndex: 'username', ellipsis: true },
        {
            key: 'status',
            title: t('adviceSeekers.column.status'),
            render: (_, seeker) => {
                const status = adviceSeekerStatus(seeker);
                const tag = <ToneBadge {...STATUS_BADGE[status]}>{t(`adviceSeekers.status.${status}`)}</ToneBadge>;
                return seeker.deleteDate ? (
                    <Tooltip title={t('adviceSeekers.status.markedOn', { date: formatDate(seeker.deleteDate) })}>
                        {tag}
                    </Tooltip>
                ) : (
                    tag
                );
            },
        },
        {
            key: 'agency',
            title: t('adviceSeekers.column.agencies'),
            render: (_, seeker) =>
                seeker.agencyIds.length ? seeker.agencyIds.map(agencyName).join(', ') : t('adviceSeekers.noAgency'),
        },
        ...(isSuperAdmin
            ? [
                  {
                      key: 'tenant',
                      title: t('adviceSeekers.column.tenant'),
                      render: (_: unknown, seeker: AdviceSeekerData) => tenantName(seeker.tenantId),
                  },
              ]
            : []),
        {
            key: 'createDate',
            title: t('adviceSeekers.column.registered'),
            render: (_, seeker) => formatDate(seeker.createDate),
        },
        ...(canDelete
            ? [
                  {
                      key: 'actions',
                      title: '',
                      width: 64,
                      render: (_: unknown, seeker: AdviceSeekerData) => (
                          <Button
                              type="text"
                              aria-label={t('adviceSeekers.delete.one', { username: seeker.username })}
                              icon={<DeleteOutlineOutlinedIcon />}
                              disabled={!canMarkForDeletion(seeker)}
                              onClick={() => setToDelete([seeker])}
                          />
                      ),
                  },
              ]
            : []),
    ];

    const selected = rows.filter((seeker) => selectedIds.includes(seeker.id));

    return (
        <div className={styles.wrapper}>
            <UserScopeFilters
                sectionId={TypeOfUser.AdviceSeekers}
                filters={filters}
                onChange={(next) => {
                    setFilters(next);
                    resetToFirstPage();
                }}
                actions={
                    canDelete && (
                        <Button
                            danger
                            disabled={selected.length === 0}
                            icon={<DeleteOutlineOutlinedIcon />}
                            onClick={() => setToDelete(selected)}
                        >
                            {t('adviceSeekers.delete.selected', { count: selected.length })}
                        </Button>
                    )
                }
            />
            <ListSearchBar query={username} onClear={clearSearch} />
            <p className={styles.hint}>{t('adviceSeekers.searchHint')}</p>
            {query.isError ? (
                <p role="alert">{t('adviceSeekers.loadError')}</p>
            ) : (
                <Table<AdviceSeekerData>
                    rowKey="id"
                    columns={columns}
                    dataSource={rows}
                    loading={query.isLoading || query.isFetching}
                    locale={{ emptyText: t('adviceSeekers.empty') }}
                    rowSelection={
                        canDelete
                            ? {
                                  selectedRowKeys: selectedIds,
                                  onChange: (keys) => setSelectedIds(keys.map(String)),
                                  getCheckboxProps: (seeker) => ({
                                      disabled: !canMarkForDeletion(seeker),
                                      'aria-label': t('adviceSeekers.select', { username: seeker.username }),
                                  }),
                              }
                            : undefined
                    }
                    pagination={{
                        current: page,
                        pageSize: perPage,
                        total: query.data?.total ?? 0,
                        showSizeChanger: true,
                    }}
                    onChange={(pagination: TablePaginationConfig) => {
                        setPage(pagination.current ?? 1);
                        setPerPage(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
                        setSelectedIds([]);
                    }}
                />
            )}
            {toDelete && (
                <DeleteAdviceSeekersModal
                    seekers={toDelete}
                    onClose={(changed) => {
                        setToDelete(null);
                        if (changed) {
                            setSelectedIds([]);
                            query.refetch();
                        }
                    }}
                />
            )}
        </div>
    );
};
